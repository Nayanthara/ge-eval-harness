"""
Top-level package anchor and forwarder for ge_eval_harness.
Enables 'import ge_eval_harness' and 'from ge_eval_harness.<submodule> import ...'
to work seamlessly regardless of whether the cloned folder name is
'ge-eval-harness', 'ge_eval_harness', or any other directory name.
"""
import sys
from pathlib import Path

__version__ = "0.1.0"
__path__ = [str(Path(__file__).resolve().parent)]

# Also provide backward-compatibility alias for eval_harness
if "eval_harness" not in sys.modules:
    sys.modules["eval_harness"] = sys.modules[__name__]
