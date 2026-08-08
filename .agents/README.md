# Repository agent extensions

This directory is intentionally minimal. Paperclip owns agent roles,
instructions, coordination, task state, and shared skills.

Only add a skill under `.agents/skills/<name>/SKILL.md` when it implements a
narrowly Roost-specific technical workflow that is not already supplied by
Paperclip. Do not store prompts, personas, task boards, project memory, or
copies of Paperclip instructions here.
