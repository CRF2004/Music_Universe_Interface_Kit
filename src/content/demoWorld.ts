import { compileSpatialScene } from '../schema';
import { assertMusicWorldProject } from '../project';
import { defaultMusicWorldProject } from './defaultMusicWorldProject';

assertMusicWorldProject(defaultMusicWorldProject);

export const demoWorld = compileSpatialScene(defaultMusicWorldProject.scene);
