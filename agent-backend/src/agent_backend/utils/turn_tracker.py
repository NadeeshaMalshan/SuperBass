"""
Turn Telemetry and Usage Tracking Callback Handler for LangGraph.
Captures per-agent execution times, LLM prompt & completion tokens, and outputs.
"""

import time
from typing import Dict, Any, List
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult


class TurnUsageLogger(BaseCallbackHandler):
    """
    Monitors all LLM and tool calls within a LangGraph execution turn.
    Calculates exact token consumption, agent breakdown, and latency.
    """

    def __init__(self):
        self.start_time = time.perf_counter()
        self.runs: Dict[str, Dict[str, Any]] = {}
        self.llm_calls: List[Dict[str, Any]] = []
        self.tool_calls: List[Dict[str, Any]] = []

    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], run_id: Any, **kwargs: Any) -> None:
        metadata = kwargs.get("metadata") or {}
        node = metadata.get("langgraph_node") or kwargs.get("name") or "agent"
        inv_params = kwargs.get("invocation_params") or {}
        model = inv_params.get("model") or inv_params.get("model_name") or "gpt-4o-mini"
        self.runs[str(run_id)] = {
            "node": node,
            "model": model,
            "start": time.perf_counter()
        }

    def on_llm_end(self, response: LLMResult, run_id: Any, **kwargs: Any) -> None:
        info = self.runs.get(str(run_id), {})
        duration = time.perf_counter() - info.get("start", time.perf_counter())
        usage = (response.llm_output or {}).get("token_usage") or {}

        # Extract generated content or tool calls
        gen_texts = []
        for gen_list in response.generations:
            for g in gen_list:
                msg = getattr(g, "message", None)
                if msg:
                    content = getattr(msg, "content", None)
                    t_calls = getattr(msg, "tool_calls", None)
                    if t_calls:
                        call_names = [tc.get("name") for tc in t_calls if isinstance(tc, dict)]
                        gen_texts.append(f"Tool invocation: {call_names}")
                    elif content:
                        clean_c = str(content).strip().replace("\n", " ")
                        gen_texts.append(clean_c[:140] + ("..." if len(clean_c) > 140 else ""))

        self.llm_calls.append({
            "node": info.get("node", "agent"),
            "model": info.get("model", "gpt-4o-mini"),
            "duration_sec": round(duration, 3),
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
            "output_summary": " | ".join(gen_texts)
        })

    def on_tool_end(self, output: Any, **kwargs: Any) -> None:
        name = kwargs.get("name") or "tool"
        out_str = str(output).strip()
        self.tool_calls.append({
            "tool": name,
            "output": out_str[:120] + ("..." if len(out_str) > 120 else "")
        })

    def get_summary(self) -> Dict[str, Any]:
        """Returns structured telemetry data for the turn."""
        total_duration = round(time.perf_counter() - self.start_time, 3)
        tot_prompt = sum(c["prompt_tokens"] for c in self.llm_calls)
        tot_comp = sum(c["completion_tokens"] for c in self.llm_calls)
        tot_tokens = sum(c["total_tokens"] for c in self.llm_calls)
        agents_involved = list(dict.fromkeys(c["node"] for c in self.llm_calls))

        return {
            "duration_sec": total_duration,
            "total_tokens": tot_tokens,
            "prompt_tokens": tot_prompt,
            "completion_tokens": tot_comp,
            "agents_involved": agents_involved,
            "steps_count": len(self.llm_calls),
            "steps": self.llm_calls,
            "tool_calls_count": len(self.tool_calls)
        }
