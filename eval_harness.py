"""
Backward-compatibility package forwarder for eval_harness.
"""
import sys
from pathlib import Path

__version__ = "0.1.0"
__path__ = [str(Path(__file__).resolve().parent)]

if "ge_eval_harness" not in sys.modules:
    try:
        import ge_eval_harness
    except ImportError:
        pass
