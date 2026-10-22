"""Reproduce W05 v02 teaching results; synthetic data, not robot experiment records.

Run: python paper/site/statistika/assets/w05_v02_analysis.py
Requires existing NumPy/SciPy only. Difference is always after minus before.
"""

import csv
import hashlib
import json
from pathlib import Path

import numpy as np
import scipy
from scipy import stats


def hotelling(d):
    """One-sample T2 on complete paired difference vectors, null vector zero."""
    d = np.asarray(d, dtype=float)
    if d.ndim != 2 or not np.isfinite(d).all():
        raise ValueError("Expected finite n by p difference matrix")
    n, p = d.shape
    if n <= p:
        raise ValueError("Hotelling requires n > p")
    mean = d.mean(axis=0)
    cov = np.atleast_2d(np.cov(d, rowvar=False, ddof=1))
    if np.linalg.matrix_rank(cov) != p:
        raise ValueError("Singular covariance; do not silently use a pseudoinverse")
    t2 = float(n * mean @ np.linalg.solve(cov, mean))
    f = (n - p) * t2 / (p * (n - 1))
    return {
        "n": n, "dimension": p, "mean": mean.tolist(), "covariance": cov.tolist(),
        "T2": t2, "F": f, "df1": p, "df2": n - p,
        "p_value": float(stats.f.sf(f, p, n - p)),
    }


def analyse():
    data_path = Path(__file__).with_name("w05_v02_data.csv")
    with data_path.open(encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    assert len({r["pair_id"] for r in rows}) == len(rows)
    before = np.array([[r["error_before_mm"], r["energy_before_J"]] for r in rows], float)
    after = np.array([[r["error_after_mm"], r["energy_after_J"]] for r in rows], float)
    d = after - before
    n = len(rows)
    summaries = []
    for j, name in enumerate(("Galat posisi (mm)", "Energi (J)")):
        delta = d[:, j]
        mean = float(delta.mean())
        sd = float(delta.std(ddof=1))
        se = sd / np.sqrt(n)
        manual_t = mean / se
        manual_p = 2 * stats.t.sf(abs(manual_t), n - 1)
        paired = stats.ttest_rel(after[:, j], before[:, j])
        np.testing.assert_allclose([manual_t, manual_p], [paired.statistic, paired.pvalue])
        ci = stats.t.interval(.95, n - 1, loc=mean, scale=se)
        np.testing.assert_allclose(ci, paired.confidence_interval())
        one = hotelling(delta[:, None])
        np.testing.assert_allclose(one["T2"], manual_t ** 2)
        np.testing.assert_allclose(one["p_value"], manual_p)
        # Family of two component tests; Bonferroni CI coverage >= 95% jointly.
        width = stats.t.ppf(1 - .05 / (2 * d.shape[1]), n - 1) * se
        shapiro = stats.shapiro(delta)
        summaries.append({
            "name": name, "mean": mean, "sd": sd, "se": float(se),
            "sum": float(delta.sum()), "sum_squared_centered": float(((delta-mean)**2).sum()),
            "t": float(manual_t), "df": n - 1, "p_value": float(manual_p),
            "ci95": list(map(float, ci)), "dz": mean / sd,
            "p_bonferroni": min(1., float(manual_p * d.shape[1])),
            "ci_bonferroni": [float(mean-width), float(mean+width)],
            "shapiro_W": float(shapiro.statistic), "shapiro_p": float(shapiro.pvalue),
        })
    joint = hotelling(d)
    # Independent algebraic route via whitening/eigendecomposition.
    cov = np.array(joint["covariance"])
    eigenvalues, eigenvectors = np.linalg.eigh(cov)
    whitened = (eigenvectors.T @ d.mean(axis=0)) / np.sqrt(eigenvalues)
    np.testing.assert_allclose(joint["T2"], n * (whitened @ whitened))
    # T2/F critical threshold equivalence at alpha .05.
    critical_f = float(stats.f.ppf(.95, d.shape[1], n-d.shape[1]))
    critical_t2 = d.shape[1] * (n-1) / (n-d.shape[1]) * critical_f
    assert (joint["T2"] > critical_t2) == (joint["p_value"] < .05)
    # Invariance to unit conversions, and to reversing the difference direction.
    np.testing.assert_allclose(hotelling(d * [1000., .001])["T2"], joint["T2"])
    np.testing.assert_allclose(hotelling(-d)["T2"], joint["T2"])
    joint.update(critical_F=critical_f, critical_T2=float(critical_t2))
    return {
        "data_type": "synthetic teaching data; no experimental claim",
        "difference": "after minus before", "alpha": .05,
        "numpy_version": np.__version__, "scipy_version": scipy.__version__,
        "data_sha256": hashlib.sha256(data_path.read_bytes()).hexdigest(),
        "rows": rows, "differences": d.tolist(), "univariate": summaries,
        "hotelling": joint, "correlation": float(np.corrcoef(d.T)[0, 1]),
        "verification": "PASS: manual/SciPy t and CI, p=1 T2=t^2, eigen T2, "
                        "F threshold, unit and sign invariance",
    }


if __name__ == "__main__":
    result = analyse()
    output = Path(__file__).with_name("w05_v02_results.json")
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: result[k] for k in ("univariate", "hotelling", "verification")}, indent=2))
