#!/usr/bin/env python3
import argparse
import json
import os
import sys


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description="FINCA MARIA — transcription locale")
    parser.add_argument("audio")
    parser.add_argument("--model", default=os.environ.get("FINCA_WHISPER_MODEL", "large-v3-turbo"))
    parser.add_argument("--language", default="fr")
    parser.add_argument("--device", default=os.environ.get("FINCA_WHISPER_DEVICE", "cpu"))
    parser.add_argument("--compute-type", default=os.environ.get("FINCA_WHISPER_COMPUTE", "int8"))
    args = parser.parse_args()

    try:
        import av
        from faster_whisper import WhisperModel
    except Exception as exc:
        emit({"type": "error", "message": f"Moteur local non installé : {exc}"})
        return 2

    try:
        duration = 0.0
        try:
            container = av.open(args.audio)
            if container.duration:
                duration = float(container.duration / av.time_base)
            container.close()
        except Exception:
            duration = 0.0

        emit({
            "type": "audio_meta",
            "duration": duration,
            "model": args.model,
            "device": args.device,
            "computeType": args.compute_type,
        })

        cache_dir = os.environ.get("FINCA_WHISPER_CACHE", "/data/baul/meetings/.models/whisper")
        os.makedirs(cache_dir, exist_ok=True)
        emit({"type": "model_loading", "model": args.model})

        model = WhisperModel(
            args.model,
            device=args.device,
            compute_type=args.compute_type,
            download_root=cache_dir,
        )
        emit({"type": "engine_ready", "model": args.model})

        segments, info = model.transcribe(
            args.audio,
            language=args.language,
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
            condition_on_previous_text=True,
            word_timestamps=True,
        )

        count = 0
        word_count = 0
        for segment in segments:
            text = (segment.text or "").strip()
            if not text:
                continue
            count += 1
            words = []
            for word in (segment.words or []):
                raw = word.word or ""
                if not raw.strip():
                    continue
                word_count += 1
                words.append({
                    "id": word_count,
                    "start": float(word.start or segment.start or 0),
                    "end": float(word.end or word.start or segment.end or 0),
                    "word": raw,
                    "probability": float(word.probability or 0),
                })

            emit({
                "type": "segment",
                "id": count,
                "start": float(segment.start or 0),
                "end": float(segment.end or segment.start or 0),
                "text": text,
                "words": words,
            })

        emit({
            "type": "done",
            "segments": count,
            "words": word_count,
            "language": getattr(info, "language", args.language),
            "languageProbability": float(getattr(info, "language_probability", 0) or 0),
            "duration": duration,
        })
        return 0
    except Exception as exc:
        emit({"type": "error", "message": str(exc)})
        return 1


if __name__ == "__main__":
    sys.exit(main())
