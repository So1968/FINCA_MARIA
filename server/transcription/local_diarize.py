#!/usr/bin/env python3
import argparse
import json
import os
import sys


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description="FINCA MARIA — séparation locale des intervenants")
    parser.add_argument("audio")
    parser.add_argument("--num-speakers", type=int, default=0)
    args = parser.parse_args()

    try:
        from pyannote.audio import Pipeline
    except Exception as exc:
        emit({"type": "error", "message": f"Pyannote n'est pas installé : {exc}"})
        return 2

    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        emit({"type": "error", "message": "Jeton Hugging Face absent pour le modèle Pyannote."})
        return 2

    try:
        emit({
            "type": "loading",
            "model": "pyannote/speaker-diarization-community-1",
            "numSpeakers": args.num_speakers or None,
        })
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-community-1",
            token=token,
        )
        call_kwargs = {}
        if args.num_speakers > 0:
            call_kwargs["num_speakers"] = args.num_speakers
        output = pipeline(args.audio, **call_kwargs)
        annotation = getattr(output, "exclusive_speaker_diarization", None)
        if annotation is None:
            annotation = getattr(output, "speaker_diarization", output)

        count = 0
        speakers = set()
        for turn, _, speaker in annotation.itertracks(yield_label=True):
            count += 1
            speakers.add(str(speaker))
            emit({
                "type": "speaker_segment",
                "id": count,
                "start": float(turn.start),
                "end": float(turn.end),
                "speaker": str(speaker),
            })

        emit({
            "type": "done",
            "segments": count,
            "speakers": sorted(speakers),
            "speakerCount": len(speakers),
            "exclusive": hasattr(output, "exclusive_speaker_diarization"),
        })
        return 0
    except Exception as exc:
        message = str(exc)
        if "gated" in message.lower() or "401" in message or "403" in message:
            message = "Accès Pyannote refusé. Accepter les conditions du modèle Community-1 sur Hugging Face puis fournir HF_TOKEN."
        emit({"type": "error", "message": message})
        return 1


if __name__ == "__main__":
    sys.exit(main())
