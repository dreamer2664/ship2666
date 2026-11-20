#!/usr/bin/env python3
"""Retrieve inspectable research originals without claiming redistribution rights.

Downloaded material is preserved locally and excluded from Git. The manifest,
checksums and URLs are versioned. No reference is considered inspected simply
because it downloaded successfully.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import csv
import hashlib
from pathlib import Path
import time
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ("TB-01", "Teutonic fact file", "Titanic Belfast", "1889 register information", "https://www.titanicbelfast.com/history-of-titanic/ship-fact-files/teutonic-fact-file", "titanic_belfast.html", "Modern institutional transcription; copyright not licensed"),
    ("RMG-01", "Teutonic (1889), G2542", "Royal Museums Greenwich", "circa 1890", "https://www.rmg.co.uk/collections/objects/rmgc-object-999661", "rmg_g2542.html", "Institutional metadata; image licensing offered"),
    ("RMG-01-IMG", "Teutonic port profile, G2542 / negative 26635", "Royal Museums Greenwich / Francis Frith & Co", "circa 1890", "https://collections.rmg.co.uk/media/418/473/g02542.jpg", "rmg_g2542.jpg", "Research copy only; no open reuse licence asserted"),
    ("RMG-02", "The Teutonic leaving Liverpool, BHC3657", "Royal Museums Greenwich / W. L. Wyllie", "1889", "https://www.rmg.co.uk/collections/objects/rmgc-object-15130", "rmg_bhc3657.html", "Review-bound configuration, not ordinary passenger service"),
    ("RMG-02-IMG", "The Teutonic leaving Liverpool, BHC3657", "Royal Museums Greenwich / W. L. Wyllie", "1889", "https://collections.rmg.co.uk/media/387/446/bhc3657.jpg", "rmg_bhc3657.jpg", "Research copy only; no open reuse licence asserted"),
    ("MAG-1900", "The Atlantic Ferry, third edition", "University of Illinois / Arthur J. Maginnis", "1900", "https://brittlebooks.library.illinois.edu/brittlebooks_open/Books2009-09/magiar0001atlfer/magiar0001atlfer.pdf", "maginnis_1900.pdf", "Historic published work; scan preserved for research, check edition/title page"),
    ("USM-2648", "White Star Line R.M.S. Teutonic, Plan of First Class Accommodation", "University of Southern Maine / Osher Map Library", "undated; barcode 2000718", "https://digitalcommons.usm.maine.edu/oml-morse-collection-gallery/2648/", "usm_2648.html", "Catalog metadata only; page exposes placeholder, not a usable plan"),
    ("USM-2651", "Plan of Saloon and State Rooms, Majestic and Teutonic", "University of Southern Maine / Osher Map Library", "undated; barcode 2000721", "https://digitalcommons.usm.maine.edu/oml-morse-collection-gallery/2651/", "usm_2651.html", "Catalog metadata only; page exposes placeholder, not a usable plan"),
    ("NH-01", "S.S. Teutonic", "Norway Heritage", "mixed dates", "https://www.norwayheritage.com/ships/teuto/", "norway_teutonic.html", "Secondary compilation; funnel-refit narrative and captions disagree"),
    ("NH-PLAN", "Teutonic second class plan", "Norway Heritage", "undated", "https://www.norwayheritage.com/media/eu5btf3d/02teuton-wsl.jpg", "second_class_plan.jpg", "Research copy; date and original publisher require verification"),
    ("NH-EARLY", "Teutonic early profile photograph", "Norway Heritage", "tentatively before 1903", "https://www.norwayheritage.com/media/kwjn3tft/teutonic.jpg", "norway_early.jpg", "Research copy; compilation caption is not a definitive date"),
    ("GG-1889", "Ocean Magazine of Travel, September 1889", "Gjenvick-Gjonvik Archives", "September 1889", "https://www.ggarchives.com/OT/Publications/OceanMagazineOfTravel-1889-09.html", "ocean_1889.html", "Archive asserts copyright; no redistribution of scan assumed"),
    ("GG-STAIR", "Teutonic grand staircase", "Gjenvick-Gjonvik Archives / Ocean", "September 1889", "https://www.ggarchives.com/Images600/Periodicals/Maritime/OceanMagazineOfTravel/1889-09/Photo01-GrandStaircase-Teutonic-WhiteStarLine-500.jpg", "ocean_staircase.jpg", "Research copy only; identified Teutonic interior"),
    ("GG-SMOKE", "Teutonic first class smoking saloon", "Gjenvick-Gjonvik Archives / Ocean", "September 1889", "https://www.ggarchives.com/Images600/Periodicals/Maritime/OceanMagazineOfTravel/1889-09/Photo02-SmokingSaloon-Teutonic-WhiteStarLine-500.jpg", "ocean_smoking.jpg", "Research copy only; identified Teutonic interior"),
    ("GG-CABIN", "Teutonic first class stateroom", "Gjenvick-Gjonvik Archives / Ocean", "September 1889", "https://www.ggarchives.com/Images600/Periodicals/Maritime/OceanMagazineOfTravel/1889-09/Photo04-Stateroom-Teutonic-WhiteStarLine-500.jpg", "ocean_stateroom.jpg", "Research copy only; identified Teutonic interior"),
    ("GG-DINING", "Teutonic main dining saloon", "Gjenvick-Gjonvik Archives / Ocean", "September 1889", "https://www.ggarchives.com/Images600/Periodicals/Maritime/OceanMagazineOfTravel/1889-09/Photo05-MainSaloon-Teutonic-WhiteStarLine-500.jpg", "ocean_dining.jpg", "Research copy only; identified Teutonic interior"),
    ("SM-856", "Catalogue of the Naval and Marine Engineering Collection", "Science Museum / Internet Archive / Wikimedia", "entry 856; edition to inspect", "https://upload.wikimedia.org/wikipedia/commons/4/42/Catalogue_of_the_naval_and_marine_engineering_collection_in_the_..._museum_.._%28IA_catalogueofnaval00scierich%29.pdf", "science_museum_catalogue.pdf", "Historic work; Majestic engine drawings are sister-ship proxy only"),
    ("MAIN-1893", "The Progress of Marine Engineering", "Thomas Main / Internet Archive / Wikimedia", "1893", "https://upload.wikimedia.org/wikipedia/commons/9/90/The_progress_of_marine_engineering%2C_from_the_time_of_Watt_until_the_present_day_%28IA_cu31924031187879%29.pdf", "main_1893.pdf", "Historic work; inspect original text, not search snippets"),
    ("SM-856-IA", "Catalogue of the Naval and Marine Engineering Collection", "Science Museum / Internet Archive", "entry 856; edition to inspect", "https://archive.org/download/catalogueofnaval00scierich/catalogueofnaval00scierich.pdf", "science_museum_ia.pdf", "Alternative original scan after Wikimedia returned HTTP 429; sister-ship proxy"),
    ("MAIN-1893-IA", "The Progress of Marine Engineering", "Thomas Main / Internet Archive / Cornell", "1893", "https://archive.org/download/cu31924031187879/cu31924031187879.pdf", "main_1893_ia.pdf", "Alternative original scan after Wikimedia returned HTTP 429"),
    ("MAG-1892-IA", "The Atlantic Ferry, first edition", "Arthur J. Maginnis / Internet Archive / Cornell", "1892; verify title page", "https://archive.org/download/cu31924030903011/cu31924030903011.pdf", "maginnis_1892.pdf", "Historic published work; complementary machinery drawings"),
]
FIELDS = ["source_id", "title", "institution", "date_configuration", "url", "local_filename", "licence_usage_notes", "retrieved_utc", "status", "bytes", "sha256", "error"]


def retrieve(row):
    sid, title, institution, date, url, filename, rights = row
    output = ROOT / "references/downloads" / filename
    output.parent.mkdir(parents=True, exist_ok=True)
    result = dict(zip(FIELDS[:7], [sid, title, institution, date, url, str(output.relative_to(ROOT)), rights]))
    result.update(retrieved_utc=datetime.now(timezone.utc).isoformat(), status="FAILED", bytes=0, sha256="", error="")
    temporary = output.with_suffix(output.suffix + ".part")
    try:
        if not output.exists():
            request = urllib.request.Request(url, headers={"User-Agent": "Ship2666HistoricalResearch/0.1 (non-commercial source inspection)"})
            started = time.monotonic()
            with urllib.request.urlopen(request, timeout=80) as response, temporary.open("wb") as stream:
                size = 0
                while chunk := response.read(1024 * 1024):
                    stream.write(chunk)
                    size += len(chunk)
                    if size > 250 * 1024**2 or time.monotonic() - started > 300:
                        raise RuntimeError("Bounded download limit exceeded")
            if filename.endswith(".pdf") and not temporary.read_bytes()[:4] == b"%PDF":
                raise RuntimeError("Response is not a PDF")
            temporary.replace(output)
        digest = hashlib.sha256()
        with output.open("rb") as stream:
            while chunk := stream.read(1024 * 1024):
                digest.update(chunk)
        result.update(status="DOWNLOADED_NOT_YET_INSPECTED", bytes=output.stat().st_size, sha256=digest.hexdigest())
    except Exception as error:
        result["error"] = str(error)
        if temporary.exists():
            temporary.unlink()
    print(sid, result["status"], result["bytes"], result["error"], flush=True)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*")
    args = parser.parse_args()
    manifest = ROOT / "references/source_manifest.csv"
    existing = {}
    if manifest.exists():
        with manifest.open(newline="") as stream:
            existing = {row["source_id"]: row for row in csv.DictReader(stream)}
    chosen = [row for row in SOURCES if not args.only or row[0] in args.only]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for row in pool.map(retrieve, chosen):
            existing[row["source_id"]] = row
    manifest.parent.mkdir(parents=True, exist_ok=True)
    with manifest.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(existing.values())


if __name__ == "__main__":
    main()
