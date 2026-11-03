# Instrument recordings: sources and licenses

Every file in this folder is an edited excerpt of a real recording published on
[Freesound](https://freesound.org). Each license allows redistribution and
modification, including commercial use: CC0 1.0 (public domain dedication),
CC BY 3.0 or CC BY 4.0. Nothing here is under NC, ND or SA terms.

CC BY recordings must credit the author and say what was changed. The
"Processing" column records the changes. Please keep this file with the audio.

## Common processing (all files)

All files were made from the Freesound HQ MP3 preview of the sound
(`cdn.freesound.org/previews/...-hq.mp3`) with ffmpeg as follows:

- downmixed to mono and resampled to 44.1 kHz
- cut to a single stroke: leading silence trimmed so the attack starts within
  about 5 ms; tail cut where it falls to about -60 dB (or to the noise floor);
  short sine fade-out at the end
- loudness normalised toward -16 LUFS integrated with true peak at or below
  -1 dBTP. For very percussive sounds the peak ceiling is reached first, so up
  to about 6 dB of fast peak limiting was applied (`alimiter`). Those files
  measure below -16 LUFS; the actual values are listed below.
- encoded as MP3, 128 kbps CBR, mono, 44.1 kHz, with metadata stripped

## Files

| File | Recording (title) | Author | License | Source page | Processing (in addition to the common steps) |
|---|---|---|---|---|---|
| `singing-bowl.mp3` | Singing Bowl - Soft Stick Meditative Hit | Rimych | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | https://freesound.org/people/Rimych/sounds/616335/ | Used 0.00–15.00 s: one soft-mallet strike on a large bowl. Cut at 15 s while still ringing, with a 3.5 s fade-out. 15.0 s, -16.4 LUFS, -4.7 dBTP. |
| `singing-bowl-rub.mp3` | Singing Bowl singing | steffcaffrey | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | https://freesound.org/people/steffcaffrey/sounds/449950/ | Used 18.00–31.00 s: the steady part of a bowl played around the rim with a soft mallet. The last 1.0 s is equal-power crossfaded into the first 1.0 s to make a seamless 12.0 s loop, with no fade at either end. -16.4 LUFS, -6.0 dBTP. |
| `bell-dorje.mp3` | Tibetan prayer bell | sarana | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | https://freesound.org/people/sarana/sounds/81832/ | Used 0.07–12.07 s: one ring of the bell, about 2.4 kHz. Cut at 12 s while still ringing, with a 3 s fade-out. 12.0 s, -16.4 LUFS, -2.3 dBTP. |
| `damaru.mp3` | One-Beat Damaru | pbimal | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | https://freesound.org/people/pbimal/sounds/813255/ | Used 0.00–1.75 s: one twist of a small damaru, about 12 bead strikes. 0.15 s fade-out. 1.75 s, -16.4 LUFS, -6.6 dBTP. |
| `nga-drum.mp3` | Tibetan Drum once | Garuda1982 | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | https://freesound.org/people/Garuda1982/sounds/116317/ | Used 1.82–2.92 s: a single drum hit. 0.3 s fade-out. 1.1 s, -19.2 LUFS, -2.4 dBTP. Peak-limited. |
| `rolmo.mp3` | Marching_Hand_Cymbal_Pair_Volume_24.wav | pjcohen | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | https://freesound.org/people/pjcohen/sounds/490163/ | Used 0.00–7.85 s: one clash of a pair of hand cymbals with its ring. 1.5 s fade-out. 7.85 s, -17.4 LUFS, -1.1 dBTP. Peak-limited. |
| `gong.mp3` | 20'' gong 004 | cdrk | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | https://freesound.org/people/cdrk/sounds/868682/ | Used 0.00–12.56 s: one stroke on a 20" Chinese chau gong. 4 s fade-out. 12.55 s, -16.8 LUFS, -2.4 dBTP. Peak-limited. |
| `temple-bell.mp3` | temple_bell_002.wav | tec_studio | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | https://freesound.org/people/tec_studio/sounds/668647/ | Used 0.00–12.20 s: one strike of a 1532 Japanese bronze temple bell (bonshō, about 1200 lb). 2.5 s fade-out. 12.2 s, -16.4 LUFS, -5.1 dBTP. |
| `woodfish.mp3` | Mokugyo.wav | jonopodmore | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | https://freesound.org/people/jonopodmore/sounds/607215/ | Used 0.00–0.40 s: one stroke on a small mokugyo (wooden fish). 0.1 s fade-out. 0.4 s, -24.4 LUFS, -2.4 dBTP. Peak-limited, and quieter in LUFS because the sound is so short. |
| `dharma-drum.mp3` | taiko1.aif | whatsanickname4u | [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/) | https://freesound.org/people/whatsanickname4u/sounds/95624/ | Used 2.56–4.41 s: the second of four hits on a semi-large nagadō taiko. 0.4 s fade-out. 1.85 s, -18.1 LUFS, -2.4 dBTP. Peak-limited. |
| `conch.mp3` (bonus) | Snailhorn.wav | Ohrwurm | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | https://freesound.org/people/Ohrwurm/sounds/64830/ | Used 1.32–7.98 s: the first of five blows on a conch-shell horn (shankha / dungkar). 0.3 s fade-out. 6.65 s, -16.5 LUFS, -7.1 dBTP. |
| `tingsha.mp3` (bonus) | Tingsha Cymbal | steffcaffrey | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | https://freesound.org/people/steffcaffrey/sounds/435074/ | Used 0.00–6.66 s: one tingsha strike. 1.5 s fade-out. 6.65 s, -16.8 LUFS, -1.2 dBTP. Peak-limited. |
| `dungchen.mp3` (bonus) | Dungchen Festival Horns - Bhutan.wav | RTB45 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | https://freesound.org/people/RTB45/sounds/192680/ | Used 123.63–128.44 s: one blast of dungchen long horns from a field recording made at a Tsechu festival in Bumthang, Bhutan. 0.5 s fade-out. 4.8 s, -16.5 LUFS, -2.1 dBTP. Some festival ambience remains under the horns. |

## Credit line (for an about or credits page)

Instrument sounds from Freesound.org. CC BY: "Tibetan prayer bell" by sarana,
"Marching_Hand_Cymbal_Pair_Volume_24.wav" by pjcohen, "20'' gong 004" by cdrk and
"Dungchen Festival Horns - Bhutan.wav" by RTB45 (CC BY 4.0); "taiko1.aif" by
whatsanickname4u (CC BY 3.0). All were trimmed, converted to mono and
loudness-normalised. CC0: Rimych, steffcaffrey, pbimal, Garuda1982, tec_studio,
jonopodmore and Ohrwurm.
