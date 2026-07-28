import {
  SPATIAL_SCENE_SCHEMA_VERSION,
  SpatialSceneDefinition,
  Vector2Tuple,
  Vector3Tuple,
} from './spatialSceneSchema';

export interface SpatialSceneValidationIssue {
  path: string;
  message: string;
}

export interface SpatialSceneValidationResult {
  valid: boolean;
  issues: SpatialSceneValidationIssue[];
}

export class SpatialSceneValidationError extends Error {
  readonly issues: SpatialSceneValidationIssue[];

  constructor(issues: SpatialSceneValidationIssue[]) {
    super(`Invalid spatial scene: ${issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`);
    this.name = 'SpatialSceneValidationError';
    this.issues = issues;
  }
}

const THEMES = new Set(['rough-comic', 'low-poly', 'minimal']);
const TERRAIN_TYPES = new Set(['curved-plane', 'flat-plane', 'sphere']);
const INTERACTION_KINDS = new Set(['dialog', 'panel', 'command', 'route', 'agent', 'inspect', 'custom']);
const ACTION_KINDS = new Set([...INTERACTION_KINDS, 'set-flag', 'clear-flag']);
const TRIGGER_KINDS = new Set(['proximity', 'click', 'hotkey', 'collision', 'zone-enter', 'zone-exit', 'scripted']);
const CAMERA_MODES = new Set(['explore', 'interaction', 'cinematic', 'inspection', 'ui-safe']);
const CONDITION_TYPES = new Set(['flag', 'app-state', 'inventory', 'permission', 'custom']);
const CONDITION_OPERATORS = new Set(['equals', 'not-equals', 'exists', 'includes', 'gt', 'lt']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVector2(value: unknown): value is Vector2Tuple {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber);
}

function isVector3(value: unknown): value is Vector3Tuple {
  return Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  issues: SpatialSceneValidationIssue[],
): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ path, message: 'must be a non-empty string' });
  }
}

function validateConditions(
  input: unknown,
  path: string,
  issues: SpatialSceneValidationIssue[],
): void {
  if (input === undefined) return;
  if (!Array.isArray(input)) {
    issues.push({ path, message: 'must be an array' });
    return;
  }

  input.forEach((condition, conditionIndex) => {
    const conditionPath = `${path}[${conditionIndex}]`;
    if (!isRecord(condition)) {
      issues.push({ path: conditionPath, message: 'must be an object' });
      return;
    }

    if (!CONDITION_TYPES.has(String(condition.type))) {
      issues.push({
        path: `${conditionPath}.type`,
        message: 'is not a supported condition type',
      });
    }
    requireNonEmptyString(condition.key, `${conditionPath}.key`, issues);

    if (
      condition.operator !== undefined &&
      !CONDITION_OPERATORS.has(String(condition.operator))
    ) {
      issues.push({
        path: `${conditionPath}.operator`,
        message: 'is not a supported condition operator',
      });
      return;
    }

    const operator =
      condition.operator ?? (condition.value === undefined ? 'exists' : 'equals');
    if (
      (operator === 'equals' ||
        operator === 'not-equals' ||
        operator === 'includes' ||
        operator === 'gt' ||
        operator === 'lt') &&
      condition.value === undefined
    ) {
      issues.push({
        path: `${conditionPath}.value`,
        message: `is required for the ${operator} operator`,
      });
    }
    if (
      (operator === 'gt' || operator === 'lt') &&
      condition.value !== undefined &&
      !isFiniteNumber(condition.value)
    ) {
      issues.push({
        path: `${conditionPath}.value`,
        message: `must be a finite number for the ${operator} operator`,
      });
    }
  });
}

export function validateSpatialScene(input: unknown): SpatialSceneValidationResult {
  const issues: SpatialSceneValidationIssue[] = [];

  if (!isRecord(input)) {
    return { valid: false, issues: [{ path: '$', message: 'must be an object' }] };
  }

  if (input.version !== SPATIAL_SCENE_SCHEMA_VERSION) {
    issues.push({
      path: '$.version',
      message: `must equal ${SPATIAL_SCENE_SCHEMA_VERSION}`,
    });
  }

  requireNonEmptyString(input.id, '$.id', issues);
  requireNonEmptyString(input.name, '$.name', issues);

  if (input.spawn !== undefined && !isVector3(input.spawn)) {
    issues.push({ path: '$.spawn', message: 'must be a finite [x, y, z] tuple' });
  }

  if (!isRecord(input.environment)) {
    issues.push({ path: '$.environment', message: 'must be an object' });
  } else {
    if (!THEMES.has(String(input.environment.theme))) {
      issues.push({ path: '$.environment.theme', message: 'is not a supported theme' });
    }

    const terrain = input.environment.terrain;
    if (!isRecord(terrain)) {
      issues.push({ path: '$.environment.terrain', message: 'must be an object' });
    } else {
      if (!TERRAIN_TYPES.has(String(terrain.type))) {
        issues.push({ path: '$.environment.terrain.type', message: 'is not supported' });
      }
      if (!isVector2(terrain.size) || terrain.size.some((size) => size <= 0)) {
        issues.push({ path: '$.environment.terrain.size', message: 'must contain two positive finite numbers' });
      }
      if (!isFiniteNumber(terrain.curvature) || terrain.curvature < 0) {
        issues.push({ path: '$.environment.terrain.curvature', message: 'must be a non-negative finite number' });
      }
    }
  }

  if (!Array.isArray(input.objects)) {
    issues.push({ path: '$.objects', message: 'must be an array' });
  } else {
    const objectIds = new Set<string>();

    input.objects.forEach((object, objectIndex) => {
      const objectPath = `$.objects[${objectIndex}]`;
      if (!isRecord(object)) {
        issues.push({ path: objectPath, message: 'must be an object' });
        return;
      }

      requireNonEmptyString(object.id, `${objectPath}.id`, issues);
      requireNonEmptyString(object.type, `${objectPath}.type`, issues);
      requireNonEmptyString(object.label, `${objectPath}.label`, issues);

      if (typeof object.id === 'string') {
        if (objectIds.has(object.id)) {
          issues.push({ path: `${objectPath}.id`, message: `duplicates object id "${object.id}"` });
        }
        objectIds.add(object.id);
      }

      if (!isRecord(object.transform)) {
        issues.push({ path: `${objectPath}.transform`, message: 'must be an object' });
      } else {
        if (!isVector3(object.transform.position)) {
          issues.push({ path: `${objectPath}.transform.position`, message: 'must be a finite [x, y, z] tuple' });
        }
        if (object.transform.rotation !== undefined && !isVector3(object.transform.rotation)) {
          issues.push({ path: `${objectPath}.transform.rotation`, message: 'must be a finite [x, y, z] tuple' });
        }
        if (object.transform.scale !== undefined && !isVector3(object.transform.scale)) {
          issues.push({ path: `${objectPath}.transform.scale`, message: 'must be a finite [x, y, z] tuple' });
        }
      }

      if (!isRecord(object.interaction)) {
        issues.push({ path: `${objectPath}.interaction`, message: 'must be an object' });
        return;
      }

      if (!INTERACTION_KINDS.has(String(object.interaction.kind))) {
        issues.push({ path: `${objectPath}.interaction.kind`, message: 'is not supported' });
      }

      if (!Array.isArray(object.interaction.triggers)) {
        issues.push({ path: `${objectPath}.interaction.triggers`, message: 'must be an array' });
      } else {
        object.interaction.triggers.forEach((trigger, triggerIndex) => {
          const triggerPath = `${objectPath}.interaction.triggers[${triggerIndex}]`;
          if (!isRecord(trigger)) {
            issues.push({ path: triggerPath, message: 'must be an object' });
            return;
          }
          if (!TRIGGER_KINDS.has(String(trigger.type))) {
            issues.push({ path: `${triggerPath}.type`, message: 'is not supported' });
          }
          if (trigger.type === 'hotkey' && (typeof trigger.hotkey !== 'string' || trigger.hotkey.length === 0)) {
            issues.push({ path: `${triggerPath}.hotkey`, message: 'is required for hotkey triggers' });
          }
          validateConditions(
            trigger.conditions,
            `${triggerPath}.conditions`,
            issues,
          );
        });
      }

      if (!Array.isArray(object.interaction.actions) || object.interaction.actions.length === 0) {
        issues.push({ path: `${objectPath}.interaction.actions`, message: 'must contain at least one action' });
      } else {
        const actionIds = new Set<string>();
        object.interaction.actions.forEach((action, actionIndex) => {
          const actionPath = `${objectPath}.interaction.actions[${actionIndex}]`;
          if (!isRecord(action)) {
            issues.push({ path: actionPath, message: 'must be an object' });
            return;
          }

          requireNonEmptyString(action.id, `${actionPath}.id`, issues);
          if (typeof action.id === 'string') {
            if (actionIds.has(action.id)) {
              issues.push({ path: `${actionPath}.id`, message: `duplicates action id "${action.id}" in the same object` });
            }
            actionIds.add(action.id);
          }

          if (!ACTION_KINDS.has(String(action.type))) {
            issues.push({ path: `${actionPath}.type`, message: 'is not supported' });
          }
          if (action.cameraMode !== undefined && !CAMERA_MODES.has(String(action.cameraMode))) {
            issues.push({ path: `${actionPath}.cameraMode`, message: 'is not supported' });
          }
          validateConditions(
            action.conditions,
            `${actionPath}.conditions`,
            issues,
          );
          if (action.type === 'set-flag' || action.type === 'clear-flag') {
            if (!isRecord(action.payload)) {
              issues.push({
                path: `${actionPath}.payload`,
                message: `must be an object for ${action.type}`,
              });
            } else {
              requireNonEmptyString(
                action.payload.key,
                `${actionPath}.payload.key`,
                issues,
              );
              if (
                action.type === 'set-flag' &&
                action.payload.value === undefined
              ) {
                issues.push({
                  path: `${actionPath}.payload.value`,
                  message: 'is required for set-flag',
                });
              }
            }
          }
        });
      }
    });
  }

  if (input.zones !== undefined) {
    if (!Array.isArray(input.zones)) {
      issues.push({ path: '$.zones', message: 'must be an array' });
    } else {
      const zoneIds = new Set<string>();
      input.zones.forEach((zone, zoneIndex) => {
        const zonePath = `$.zones[${zoneIndex}]`;
        if (!isRecord(zone)) {
          issues.push({ path: zonePath, message: 'must be an object' });
          return;
        }
        requireNonEmptyString(zone.id, `${zonePath}.id`, issues);
        requireNonEmptyString(zone.label, `${zonePath}.label`, issues);
        if (typeof zone.id === 'string') {
          if (zoneIds.has(zone.id)) {
            issues.push({ path: `${zonePath}.id`, message: `duplicates zone id "${zone.id}"` });
          }
          zoneIds.add(zone.id);
        }
        if (!isVector3(zone.position)) {
          issues.push({ path: `${zonePath}.position`, message: 'must be a finite [x, y, z] tuple' });
        }
        if (!isFiniteNumber(zone.radius) || zone.radius <= 0) {
          issues.push({ path: `${zonePath}.radius`, message: 'must be a positive finite number' });
        }
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function assertSpatialScene(input: unknown): asserts input is SpatialSceneDefinition {
  const result = validateSpatialScene(input);
  if (!result.valid) {
    throw new SpatialSceneValidationError(result.issues);
  }
}
