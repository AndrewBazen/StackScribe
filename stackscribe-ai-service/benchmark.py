#!/usr/bin/env python3
"""
Benchmark script to measure AI service performance before/after optimizations.

Usage:
    # Run BEFORE optimizations
    python benchmark.py
    mv benchmark_*.json benchmark_before.json

    # Apply optimizations, rebuild containers

    # Run AFTER optimizations
    python benchmark.py
    mv benchmark_*.json benchmark_after.json

    # Compare results
    python benchmark.py --compare benchmark_before.json benchmark_after.json
"""
import time
import statistics
import json
import sys
import argparse
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: requests library required. Run: pip install requests")
    sys.exit(1)

BASE_URL = "http://localhost:8000"

# Test payloads
SUGGESTION_PAYLOAD = {
    "text": "This document describes the authentication flow for user login. "
            "Users must provide valid credentials including username and password. "
            "The system validates against the user database and returns a JWT token.",
    "current_entry_id": "test-entry-123"
}

INDEX_PAYLOAD = {
    "entries": [
        {
            "entry_id": f"bench-{i}",
            "entry_name": f"Benchmark Entry {i}",
            "content": f"Sample content for benchmarking entry {i}. " * 50 +
                      f"This entry covers topic {i} with various technical details. " * 20,
            "archive_id": "bench-archive",
            "tome_id": "bench-tome"
        }
        for i in range(10)
    ]
}

AMBIGUITY_PAYLOAD = {
    "chunks": [
        {
            "id": "chunk-1",
            "text": "The system should be fast and user-friendly. "
                    "It needs to handle many requests efficiently.",
            "start_offset": 0,
            "end_offset": 100
        }
    ]
}


def measure_endpoint(name: str, method: str, url: str, payload=None, iterations: int = 10, warmup: int = 2):
    """Measure endpoint latency over multiple iterations."""
    times = []
    errors = 0

    # Warmup runs (not counted)
    for _ in range(warmup):
        try:
            if method == "GET":
                requests.get(url, timeout=30)
            else:
                requests.post(url, json=payload, timeout=120)
        except Exception:
            pass

    # Actual measurements
    for i in range(iterations):
        try:
            start = time.perf_counter()
            if method == "GET":
                resp = requests.get(url, timeout=30)
            else:
                resp = requests.post(url, json=payload, timeout=120)
            elapsed = (time.perf_counter() - start) * 1000  # ms
            times.append(elapsed)
            if resp.status_code >= 400:
                print(f"  Warning: {name} returned {resp.status_code}")
                errors += 1
        except Exception as e:
            print(f"  Error on iteration {i+1}: {e}")
            errors += 1
            times.append(float('inf'))

    # Filter out errors for statistics
    valid_times = [t for t in times if t != float('inf')]

    if not valid_times:
        return {
            "endpoint": name,
            "iterations": iterations,
            "errors": errors,
            "min_ms": None,
            "max_ms": None,
            "avg_ms": None,
            "median_ms": None,
            "p95_ms": None,
            "std_dev_ms": None,
        }

    return {
        "endpoint": name,
        "iterations": iterations,
        "errors": errors,
        "min_ms": round(min(valid_times), 2),
        "max_ms": round(max(valid_times), 2),
        "avg_ms": round(statistics.mean(valid_times), 2),
        "median_ms": round(statistics.median(valid_times), 2),
        "p95_ms": round(sorted(valid_times)[int(len(valid_times) * 0.95)] if len(valid_times) >= 5 else max(valid_times), 2),
        "std_dev_ms": round(statistics.stdev(valid_times), 2) if len(valid_times) >= 2 else 0,
    }


def check_service_health():
    """Check if the AI service is running."""
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        return resp.status_code == 200
    except Exception:
        return False


def run_benchmark():
    """Run the full benchmark suite."""
    print("=" * 60)
    print("StackScribe AI Service Benchmark")
    print("=" * 60)

    # Check service is running
    print("\nChecking service health...")
    if not check_service_health():
        print("Error: AI service not responding at", BASE_URL)
        print("Make sure to start the service: docker compose up -d")
        sys.exit(1)
    print("Service is healthy!")

    results = {
        "timestamp": datetime.now().isoformat(),
        "base_url": BASE_URL,
        "measurements": []
    }

    print("\nRunning benchmarks...")
    print("-" * 60)

    # 1. Health check (baseline)
    print("1. Health check (baseline latency)...")
    results["measurements"].append(
        measure_endpoint("GET /health", "GET", f"{BASE_URL}/health", iterations=10)
    )

    # 2. Index entries (measures embedding speed)
    print("2. Index entries (embedding speed)...")
    results["measurements"].append(
        measure_endpoint("POST /api/index_entries", "POST",
                        f"{BASE_URL}/api/index_entries", INDEX_PAYLOAD, iterations=5, warmup=1)
    )

    # 3. Suggestions - cold (measures search + rerank + heuristics)
    print("3. Link suggestions - cold (first query)...")
    results["measurements"].append(
        measure_endpoint("POST /api/suggestions (cold)", "POST",
                        f"{BASE_URL}/api/suggestions", SUGGESTION_PAYLOAD, iterations=5, warmup=0)
    )

    # 4. Suggestions - warm (measures cache effectiveness)
    print("4. Link suggestions - warm (cached query)...")
    results["measurements"].append(
        measure_endpoint("POST /api/suggestions (warm)", "POST",
                        f"{BASE_URL}/api/suggestions", SUGGESTION_PAYLOAD, iterations=10, warmup=2)
    )

    # 5. Ambiguity detection (if available, measures LLM call latency)
    print("5. Ambiguity detection (LLM latency)...")
    try:
        results["measurements"].append(
            measure_endpoint("POST /api/detect_ambiguity", "POST",
                            f"{BASE_URL}/api/detect_ambiguity", AMBIGUITY_PAYLOAD, iterations=3, warmup=1)
        )
    except Exception as e:
        print(f"  Skipped: {e}")

    # Print summary
    print("\n" + "=" * 60)
    print("BENCHMARK RESULTS")
    print("=" * 60)
    print(f"{'Endpoint':<45} {'Avg (ms)':>10} {'Min (ms)':>10} {'P95 (ms)':>10}")
    print("-" * 75)

    for m in results["measurements"]:
        avg = f"{m['avg_ms']:.2f}" if m['avg_ms'] is not None else "N/A"
        min_val = f"{m['min_ms']:.2f}" if m['min_ms'] is not None else "N/A"
        p95 = f"{m['p95_ms']:.2f}" if m['p95_ms'] is not None else "N/A"
        print(f"{m['endpoint']:<45} {avg:>10} {min_val:>10} {p95:>10}")

    # Save results
    filename = f"benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to: {filename}")

    return results


def compare_results(before_file: str, after_file: str):
    """Compare two benchmark result files."""
    try:
        with open(before_file) as f:
            before = json.load(f)
        with open(after_file) as f:
            after = json.load(f)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)

    print("=" * 80)
    print("BENCHMARK COMPARISON")
    print("=" * 80)
    print(f"Before: {before['timestamp']}")
    print(f"After:  {after['timestamp']}")
    print("-" * 80)
    print(f"{'Endpoint':<40} {'Before (ms)':>12} {'After (ms)':>12} {'Improvement':>12}")
    print("-" * 80)

    before_map = {m['endpoint']: m for m in before['measurements']}
    after_map = {m['endpoint']: m for m in after['measurements']}

    for endpoint in before_map:
        b = before_map.get(endpoint, {})
        a = after_map.get(endpoint, {})

        b_avg = b.get('avg_ms')
        a_avg = a.get('avg_ms')

        if b_avg and a_avg:
            improvement = ((b_avg - a_avg) / b_avg) * 100
            sign = "+" if improvement > 0 else ""
            print(f"{endpoint:<40} {b_avg:>12.2f} {a_avg:>12.2f} {sign}{improvement:>11.1f}%")
        else:
            print(f"{endpoint:<40} {'N/A':>12} {'N/A':>12} {'N/A':>12}")

    print("-" * 80)


def main():
    parser = argparse.ArgumentParser(description="Benchmark StackScribe AI Service")
    parser.add_argument("--compare", nargs=2, metavar=("BEFORE", "AFTER"),
                       help="Compare two benchmark result files")
    parser.add_argument("--url", default="http://localhost:8000",
                       help="Base URL of the AI service (default: http://localhost:8000)")

    args = parser.parse_args()

    global BASE_URL
    BASE_URL = args.url

    if args.compare:
        compare_results(args.compare[0], args.compare[1])
    else:
        run_benchmark()


if __name__ == "__main__":
    main()
