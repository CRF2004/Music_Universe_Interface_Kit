# BPM and song information tools

Primary documentation reviewed 2026-10-05. No dependency/service adopted or
runtime benchmark of these tools performed in this slice.

## BPM candidate

[web-audio-beat-detector](https://github.com/chrisguttandin/web-audio-beat-detector)
uses Web Audio and accepts a decoded AudioBuffer. `guess()` returns estimated
BPM, tempo and first-beat offset; configurable tempo range defaults to 90–180.
Its MIT license and AudioBuffer input fit the current local workflow. This is
the first candidate for a separate accuracy/bundle/lifecycle spike, not an
assumption of reliable beats for every genre. Test known click tracks at several
tempos, half/double-tempo ambiguity, beatless/silent audio, variable tempo and
the authorized real song. Keep results editable and identify estimates clearly.

[Essentia.js](https://mtg.github.io/essentia.js/) offers a larger WebAssembly
analysis stack. [Official licensing](https://essentia.upf.edu/licensing_information.html)
describes AGPLv3 and commercial licensing, plus separate model/dependency
conditions. It requires a licensing and payload review before adoption. No
pretrained models or code from this tool were added.

## Song information chain — proposed follow-up

1. Creator supplies/corrects song title and artist; preserve local file identity.
2. Explicit search sends those text fields to
   [MusicBrainz recording search](https://musicbrainz.org/doc/MusicBrainz_API/Search).
3. Display candidates with artist, duration and source ID; creator chooses one.
4. Store selected metadata and provenance independently of measured audio data.
   Metadata must never replace the decoded duration or declare content rights.
5. Cache/deduplicate requests and honor the
   [API identification/rate policy](https://musicbrainz.org/doc/MusicBrainz_API):
   at most one call per second. A browser client cannot set the usual User-Agent
   header; investigate an acceptable client identification strategy before wiring
   a direct browser API, without adding a speculative server in this slice.

[AcoustID lookup](https://acoustid.org/webservice) requires a client key and an
audio fingerprint with duration; its service states free use is non-commercial
and commercial use requires contact. Fingerprinting, credentials and applicable
terms need separate review. No fingerprint or song was submitted.

Text matching can return several recordings and remasters. Imported titles and
third-party metadata remain suggestions; they cannot establish upload rights or
replace local waveform/level measurements. Search failure should preserve all
manual metadata and local editing.
