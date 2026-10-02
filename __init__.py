"""
Gemini Enterprise Evaluation & Benchmarking Harness (ge_eval_harness).
"""
import sys

__version__ = "0.1.0"

# Provide backward-compatibility alias for eval_harness
if "eval_harness" not in sys.modules:
    sys.modules["eval_harness"] = sys.modules[__name__]

