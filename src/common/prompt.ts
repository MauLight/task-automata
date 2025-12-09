export const taskPrompt = `Input task may be "<Type>: <desc>, priority <priority>" or plain text.

Extract:
- type: if given → use; else infer: contains issue/error → "Bug fix", else "Feature"
- priority: if given → use; else "low"
- description: rewrite clearly and professionally, same meaning

Rules:
- do not invent details
- do not modify explicit type/priority
- reply ONLY with this JSON:

{"type":"","priority":"","description":""}

Input: "{USER_INPUT}"`