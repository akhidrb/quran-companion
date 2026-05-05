# Islamic Scholar Agent

An autonomous multi-step research agent built on LangChain + LangGraph that answers complex Islamic questions by consulting multiple scholarly corpora, routing across madhabs, checking scholarly consensus, and validating its own grounding before responding.

This is an extension of the Quran Companion RAG system — not a replacement.

---

## What makes this different from the existing RAG system

The existing system is a linear pipeline:

```
question → embed → retrieve → generate → respond
```

The Scholar Agent is a stateful graph with dynamic routing, tool use, loops, and self-critique:

```
question → classify → route to sub-chains → cross-reference → consensus check → critique → respond
```

The agent decides *how* to answer, not just *what* to retrieve.

---

## Architecture

```
User Question
      │
      ▼
[Classifier Chain]
      │
      ├── Fiqh (ruling/permissibility)
      │         └── [Madhab Router]
      │                   ├── Hanafi retriever
      │                   ├── Maliki retriever
      │                   ├── Shafi'i retriever
      │                   └── Hanbali retriever
      │
      ├── Tafsir (Quranic interpretation)
      │         ├── [Quran Retriever]
      │         ├── [Tafsir Retriever]
      │         └── [Cross-reference Tool]
      │
      ├── Hadith (prophetic tradition)
      │         ├── [Hadith DB Tool]
      │         └── [Isnad Checker Tool]
      │
      └── Historical/Seerah
                ├── [Seerah Retriever]
                └── [Scholar Bio Tool]
                          │
                          ▼
               [Consensus Checker Chain]
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
         Agreement              Disagreement
              │                       │
              ▼                       ▼
       [Answer Chain]     [Nuance Explainer Chain]
                                      │
                                      ▼
                           [Self-Critique Chain]
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                      Grounded              Not grounded
                          │                       │
                          ▼                       ▼
                   Final Response          Retry or Refuse
```

---

## Why LangChain is required here

| Requirement | Why raw SDK can't handle it | LangChain solution |
|---|---|---|
| Stateful multi-step graph | You'd write your own state machine | LangGraph manages state, edges, and conditionals |
| Dynamic tool selection | Manual if/else branching per question type | Agent decides which tools to call at runtime |
| Multiple vector stores unified | Custom dispatcher per store | `EnsembleRetriever` or `MultiVectorRetriever` |
| Retry loop when grounding fails | Manual recursion with state tracking | LangGraph cycle edges with max retries |
| Streaming partial reasoning to UI | Manual SSE wiring per chain | Built-in streaming callbacks |
| Debugging 6-step pipeline | Add logging everywhere by hand | LangSmith traces every chain call automatically |
| Conversation memory across turns | Manual history management | `ConversationBufferWindowMemory` or `LangGraph` state |

---

## Components

### 1. Classifier Chain

Determines which sub-chain should handle the question.

**Input:** raw user question  
**Output:** one of `fiqh | tafsir | hadith | historical`  
**Implementation:** `LLMChain` with a structured output parser

```python
from langchain.chains import LLMChain
from langchain.output_parsers import EnumOutputParser
from langchain_anthropic import ChatAnthropic

classifier_chain = LLMChain(
    llm=ChatAnthropic(model="claude-sonnet-4-6"),
    prompt=classifier_prompt,
    output_parser=EnumOutputParser(enum=QuestionType)
)
```

---

### 2. Madhab Router

For fiqh questions, retrieves rulings from each of the four major schools separately then compares.

**Why separate retrievers:** each madhab's corpus uses different terminology. A single retriever would conflate them.

```python
madhab_retrievers = {
    "hanafi":  hanafi_vectorstore.as_retriever(),
    "maliki":  maliki_vectorstore.as_retriever(),
    "shafii":  shafii_vectorstore.as_retriever(),
    "hanbali": hanbali_vectorstore.as_retriever(),
}
```

The router calls all four in parallel using LangGraph's `Send` API.

---

### 3. Isnad Checker Tool

A structured tool the agent can call to look up hadith authenticity grades.

**Input:** hadith text or reference  
**Output:** grade (`sahih | hasan | da'if | mawdu`), narrator chain summary

```python
from langchain.tools import StructuredTool

isnad_checker = StructuredTool.from_function(
    func=check_isnad,
    name="isnad_checker",
    description="Look up the authenticity grade of a hadith. Use this before citing any hadith in an answer."
)
```

---

### 4. Consensus Checker Chain

Compares outputs from multiple sub-chains and determines whether scholars agree or disagree.

**Input:** list of retrieved rulings/interpretations  
**Output:** `{ consensus: bool, summary: str, disagreement_points: list }`

If `consensus=False`, routes to the Nuance Explainer Chain instead of the Answer Chain.

---

### 5. Self-Critique Chain

A second LLM call that reads the draft answer and scores it for grounding.

**Input:** draft answer + source passages used  
**Output:** `{ grounded: bool, score: float, unsupported_claims: list }`

If `grounded=False`, the graph loops back to retrieval with refined queries. Maximum 2 retries before falling back to a refusal.

```python
critique_chain = LLMChain(
    llm=ChatAnthropic(model="claude-sonnet-4-6"),
    prompt=critique_prompt,
    output_parser=GroundingScoreParser()
)
```

---

### 6. LangGraph State Machine

The entire pipeline is a LangGraph `StateGraph`. Each node is a chain or tool. Edges are conditional.

```python
from langgraph.graph import StateGraph, END

graph = StateGraph(AgentState)

graph.add_node("classify", classifier_node)
graph.add_node("route_fiqh", madhab_router_node)
graph.add_node("route_tafsir", tafsir_node)
graph.add_node("route_hadith", hadith_node)
graph.add_node("check_consensus", consensus_node)
graph.add_node("generate_answer", answer_node)
graph.add_node("explain_nuance", nuance_node)
graph.add_node("critique", critique_node)

graph.add_conditional_edges("classify", route_by_type, {
    "fiqh":       "route_fiqh",
    "tafsir":     "route_tafsir",
    "hadith":     "route_hadith",
    "historical": "route_tafsir",
})

graph.add_conditional_edges("check_consensus", route_by_consensus, {
    "agree":    "generate_answer",
    "disagree": "explain_nuance",
})

graph.add_conditional_edges("critique", route_by_grounding, {
    "grounded":     END,
    "not_grounded": "route_tafsir",  # retry with refined query
})

graph.set_entry_point("classify")
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Agent framework | LangChain + LangGraph |
| LLM | Anthropic Claude `claude-sonnet-4-6` via `langchain-anthropic` |
| Embeddings | OpenAI `text-embedding-3-small` via `langchain-openai` |
| Vector stores | Supabase pgvector (one per corpus) |
| Tracing | LangSmith |
| Backend | FastAPI |
| Frontend | Next.js (existing) |

---

## Corpora required

| Corpus | Used by | Notes |
|---|---|---|
| Quran (6,236 verses + tafsir) | Tafsir chain | Already ingested in existing system |
| Fi Zilal al-Quran | Tafsir chain | Already ingested in existing system |
| Hanafi fiqh texts | Madhab router | New — needs ingest |
| Maliki fiqh texts | Madhab router | New — needs ingest |
| Shafi'i fiqh texts | Madhab router | New — needs ingest |
| Hanbali fiqh texts | Madhab router | New — needs ingest |
| Hadith collections (Bukhari, Muslim) | Hadith chain | New — needs ingest |
| Seerah sources | Historical chain | New — needs ingest |

---

## LangSmith tracing

Every chain call in the graph is automatically logged to LangSmith. For a 6-step pipeline this is essential — without it, debugging *why* the agent chose a madhab, rejected its own answer, or fell back to a refusal would require adding manual logging at every node.

Set in `.env`:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=islamic-scholar-agent
```

---

## Safety constraints (inherited from PRD)

- No fatwa-style rulings — agent states scholarly positions, not personal rulings
- No controversial interpretations — if sources conflict significantly, present all positions
- If the self-critique chain rejects grounding twice → explicit refusal with explanation
- Hadith must pass isnad check before being cited
- No external internet search — all retrieval is from internal corpora only

---

## Project structure

```
scholar-agent/
├── agent/
│   ├── graph.py              # LangGraph StateGraph definition
│   ├── state.py              # AgentState TypedDict
│   ├── nodes/
│   │   ├── classifier.py     # Question type classification
│   │   ├── madhab_router.py  # Parallel madhab retrieval
│   │   ├── tafsir.py         # Quran + tafsir chain
│   │   ├── hadith.py         # Hadith retrieval + isnad check
│   │   ├── consensus.py      # Cross-source consensus checker
│   │   ├── answer.py         # Final answer generation
│   │   ├── nuance.py         # Disagreement explainer
│   │   └── critique.py       # Self-grounding critique
│   └── tools/
│       ├── isnad_checker.py  # Hadith grade lookup tool
│       ├── cross_reference.py # Verse cross-reference tool
│       └── scholar_bio.py    # Scholar biography lookup
├── retrievers/
│   ├── quran.py
│   ├── tafsir.py
│   ├── hanafi.py
│   ├── maliki.py
│   ├── shafii.py
│   ├── hanbali.py
│   ├── hadith.py
│   └── seerah.py
├── routes/
│   └── scholar.py            # POST /api/scholar — streaming endpoint
├── requirements.txt
└── .env.example
```

---

## Relationship to existing Quran Companion

The Scholar Agent is a new route (`/api/scholar`) alongside the existing `/api/ask`. The existing system handles simple questions fast. The Scholar Agent handles complex questions that need multi-source reasoning — at the cost of higher latency (~5–15s vs ~2s).

The vector stores, embedding pipeline, and Supabase setup are shared. Only the new corpora (madhab texts, hadith, seerah) need additional ingestion.

---

## Estimated build time

| Component | Effort |
|---|---|
| LangGraph state machine + nodes | 2 weeks |
| Madhab corpus ingestion (4 schools) | 1 week |
| Hadith + seerah ingestion | 1 week |
| Isnad checker tool | 3 days |
| Self-critique chain + retry loop | 3 days |
| LangSmith integration + tracing | 1 day |
| Streaming endpoint + UI updates | 3 days |
| **Total** | **~6–7 weeks** |
