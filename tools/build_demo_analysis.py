from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


def safe_number(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def compute_metrics_for_mode(mode: str, domains: list[dict], meta: dict) -> dict:
    cost_per_hour = safe_number(meta.get("demoMetaInfo", {}).get("costPerHour"), 3000)

    total_daily_volume = 0
    total_processed_after = 0
    total_time_before = 0
    total_time_after = 0
    total_cost_before = 0
    total_cost_after = 0

    domain_metrics: dict[str, dict] = {}

    for domain in domains:
        metrics = domain.get("demoMetrics")
        if not metrics:
            continue

        domain_id = domain.get("id")
        daily_volume = safe_number(metrics.get("dailyVolume"), 0)
        reduction_rate = safe_number(metrics.get("reductionRates", {}).get(mode), 0)
        time_reduction_rate = safe_number(metrics.get("timeReductionRates", {}).get(mode), 0)
        cost_reduction_rate = safe_number(metrics.get("costReductionPercentage", {}).get(mode), 0)
        admin_dependency = safe_number(metrics.get("administrativeDependency"), 0)

        # 行政DXの波及効果（行政がAI以外の場合に低下）
        if domain_id != "administration" and mode != "ai":
            admin_degradation = admin_dependency * 0.3
            reduction_rate = max(0.0, reduction_rate - (reduction_rate * admin_degradation))
            time_reduction_rate = max(0.0, time_reduction_rate - (time_reduction_rate * admin_degradation))
            cost_reduction_rate = max(0.0, cost_reduction_rate - (cost_reduction_rate * admin_degradation))

        processed_before = daily_volume
        processed_after = round(daily_volume * (1 - reduction_rate))

        average_time_per_case = safe_number(metrics.get("averageTimePerCase"), 0)
        time_before = round(average_time_per_case * processed_before / 60)
        time_after = round(average_time_per_case * processed_before * (1 - time_reduction_rate) / 60)

        cost_before = round(time_before * cost_per_hour * 21 / 1000) * 1000
        cost_after = round(time_after * cost_per_hour * 21 / 1000) * 1000

        total_daily_volume += daily_volume
        total_processed_after += processed_after
        total_time_before += time_before
        total_time_after += time_after
        total_cost_before += cost_before
        total_cost_after += cost_after

        domain_metrics[domain_id] = {
            "id": domain_id,
            "name": domain.get("name"),
            "emoji": domain.get("emoji"),
            "dailyVolume": daily_volume,
            "processedBefore": processed_before,
            "processedAfter": processed_after,
            "timeBefore": time_before,
            "timeAfter": time_after,
            "costBefore": cost_before,
            "costAfter": cost_after,
            "reductionRate": reduction_rate,
            "timeReductionRate": time_reduction_rate,
            "costReductionRate": cost_reduction_rate,
            "administrativeDependency": admin_dependency,
            "impactOnOtherDomains": metrics.get("impactOnOtherDomains", {}),
        }

    total_reduction_rate = 0.0
    if total_daily_volume:
        total_reduction_rate = 1 - (total_processed_after / total_daily_volume)

    total_time_saving = total_time_before - total_time_after
    total_cost_saving = total_cost_before - total_cost_after

    admin_dependent_domains = [
        m.get("name")
        for domain_id, m in domain_metrics.items()
        if domain_id != "administration" and safe_number(m.get("administrativeDependency"), 0) > 0.5
    ]

    if mode == "ai":
        admin_impact_message = f"✅ 行政DXがAIレベルのため、{'・'.join(admin_dependent_domains)}の効率が最大化されています"
    elif mode == "plain":
        admin_impact_message = f"⚠️ 行政DXがPlainのため、{'・'.join(admin_dependent_domains)}の効率が制限されています"
    else:
        admin_impact_message = "→ 行政DXが中程度のため、各分野の効率向上に部分的な制約があります"

    return {
        "currentMode": mode,
        "totalDailyVolume": total_daily_volume,
        "totalReductionRate": total_reduction_rate,
        "totalTimeBefore": total_time_before,
        "totalTimeAfter": total_time_after,
        "totalTimeSaving": total_time_saving,
        "totalCostBefore": total_cost_before,
        "totalCostAfter": total_cost_after,
        "totalCostSaving": total_cost_saving,
        "domainMetrics": domain_metrics,
        "adminImpactMessage": admin_impact_message,
        "costPerHour": cost_per_hour,
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    domains_path = repo_root / "assets" / "data" / "domains.json"
    output_path = repo_root / "assets" / "data" / "demo-analysis-precomputed.json"

    with domains_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    meta = data.get("meta", {})
    domains = data.get("domains", [])

    modes = ["plain", "smart", "ai"]
    precomputed = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "source": "domains.json",
            "version": meta.get("version", "unknown"),
            "defaultMode": meta.get("defaultMode", "plain"),
        },
        "modes": {mode: compute_metrics_for_mode(mode, domains, meta) for mode in modes},
    }

    output_path.write_text(
        json.dumps(precomputed, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
