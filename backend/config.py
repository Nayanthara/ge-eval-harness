"""
Protocol Configuration and Query Scenario Matrix Engine for Gemini Enterprise Eval Harness.
Manages evaluation test parameters, Cartesian scenario expansion, and YAML/JSON configurations.
"""

import dataclasses
from dataclasses import dataclass, field
import os
from typing import Any, Dict, List
import uuid


@dataclass
class ProtocolConfig:
    """Core test protocol parameters for Gemini Enterprise streamAssist evaluation."""
    agent_ids: List[str] = field(default_factory=lambda: ["core_assistant"])
    search_mode: str = field(default_factory=lambda: os.environ.get("SEARCH_MODE", "Vector"))
    company_name: str = field(default_factory=lambda: os.environ.get("COMPANY_NAME", "Yahoo"))
    models: List[str] = field(default_factory=lambda: ["gemini-3.5-flash", "gemini-3.1-pro"])
    interfaces: List[str] = field(default_factory=lambda: ["api_stream_assist"])
    instruction_sets: List[str] = field(default_factory=lambda: ["Default"])
    connectors: List[str] = field(default_factory=lambda: [os.environ.get("CONNECTOR_ID", "all")])
    dataset_key: str = ""
    active_connectors: List[str] = field(default_factory=list)
    iterations: int = 5
    max_concurrent_calls: int = 25
    answer_generation_mode: str = "NORMAL"
    assist_skipping_mode: str = "REQUEST_ASSIST"
    search_result_mode: str = "CHUNKS"
    custom_system_instruction: str = ""
    api_timeout_sec: int = 60
    scenario_timeout_sec: int = 120
    run_timeout_sec: int = 600
    max_qps: float = 10.0

    @property
    def concurrency_limit(self) -> int:
        return self.max_concurrent_calls

    @concurrency_limit.setter
    def concurrency_limit(self, val: int):
        self.max_concurrent_calls = val



@dataclass
class QueryScenarioConfig:
    """Individual query scenario with ground truth for factual verification."""
    query: str
    ground_truth: str = ""
    description: str = ""
    connector_id: str = "all"
    expected_source: Any = ""
    expected_sources: List[str] = field(default_factory=list)
    lookup_type: str = ""
    category: str = ""
    glean_response_text: str = ""
    glean_source_urls: str = ""

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueryScenarioConfig":
        """Instantiates QueryScenarioConfig safely ignoring unexpected keyword arguments."""
        valid_fields = {f.name for f in dataclasses.fields(cls)}
        filtered = {k: v for k, v in data.items() if k in valid_fields}
        return cls(**filtered)

    def __post_init__(self):
        # Normalize description if passed as a list
        if isinstance(self.description, (list, tuple, set)):
            if not self.expected_sources and not self.expected_source:
                self.expected_sources = [str(x).strip() for x in self.description if str(x).strip()]
                self.expected_source = self.expected_sources
            self.description = ", ".join(str(x) for x in self.description)
        elif not isinstance(self.description, str):
            self.description = str(self.description or "")

        # Auto-normalize expected_source and expected_sources so both are always populated consistently
        if not self.expected_sources and self.expected_source:
            if isinstance(self.expected_source, (list, tuple, set)):
                self.expected_sources = [str(x).strip() for x in self.expected_source if str(x).strip()]
            elif isinstance(self.expected_source, str) and self.expected_source.strip():
                if "|" in self.expected_source:
                    self.expected_sources = [s.strip() for s in self.expected_source.split("|") if s.strip()]
                elif "," in self.expected_source and not self.expected_source.startswith("http"):
                    self.expected_sources = [s.strip() for s in self.expected_source.split(",") if s.strip()]
                else:
                    self.expected_sources = [self.expected_source.strip()]
        elif self.expected_sources and not self.expected_source:
            self.expected_source = self.expected_sources[0] if len(self.expected_sources) == 1 else self.expected_sources
        elif not self.expected_sources and not self.expected_source and self.description:
            # Fallback for datasets where description historically contained the source
            desc = self.description.strip()
            if desc.startswith("http") or len(desc) == 33 or desc.endswith(".md") or desc.endswith(".pdf"):
                self.expected_source = desc
                self.expected_sources = [desc]


def expand_scenario_matrix(
    config: ProtocolConfig,
    scenarios: List[QueryScenarioConfig],
) -> List[Dict[str, Any]]:
    """
    Expands the Cartesian product of (agent_ids x interfaces x models x instruction_sets x scenarios)
    to generate the evaluation execution matrix.
    """
    expanded = []
    cell_idx = 0
    for agent_id in config.agent_ids:
        for interface in config.interfaces:
            for model_id in config.models:
                for instruction_set in config.instruction_sets:
                    for scenario in scenarios:
                        # Resolve scenario-specific connectors
                        sc_conn_str = getattr(scenario, "connector_id", "all")
                        if sc_conn_str == "none":
                            sc_connectors = ["none"]
                        elif sc_conn_str and sc_conn_str != "all":
                            sc_connectors = [sc_conn_str.strip()]
                        elif config.connectors and config.connectors != ["all"]:
                            sc_connectors = config.connectors
                        else:
                            sc_connectors = ["all"]

                        exp_src = getattr(scenario, "expected_source", "") or getattr(scenario, "expected_sources", []) or getattr(scenario, "description", "")
                        exp_list = exp_src if isinstance(exp_src, list) else ([exp_src] if exp_src else [])

                        for connector in sc_connectors:
                            cell_idx += 1
                            expanded.append(
                                {
                                    "run_id": f"cell_{cell_idx}_{uuid.uuid4().hex[:4]}",
                                    "agent_id": agent_id,
                                    "search_mode": config.search_mode,
                                    "company_name": config.company_name,
                                    "interface": interface,
                                    "model_id": model_id,
                                    "instruction_set": instruction_set,
                                    "custom_system_instruction": config.custom_system_instruction,
                                    "connectors_used": connector,
                                    "query": scenario.query,
                                    "ground_truth": scenario.ground_truth,
                                    "description": scenario.description,
                                    "expected_source": exp_src,
                                    "expected_sources": exp_list,
                                    "iterations": config.iterations,
                                    "answer_generation_mode": config.answer_generation_mode,
                                    "assist_skipping_mode": config.assist_skipping_mode,
                                    "search_result_mode": config.search_result_mode,
                                    "api_timeout_sec": config.api_timeout_sec,
                                    "scenario_timeout_sec": config.scenario_timeout_sec,
                                }
                            )
    return expanded
