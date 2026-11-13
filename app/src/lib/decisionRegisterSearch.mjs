function normalize(value) {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
}

export function searchDecisionRegister(decisions, query) {
  const words = normalize(query).trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return decisions;
  return decisions.filter((item) => {
    const text = normalize([item.note, item.responsible, item.title, item.theme, item.subjects, item.summary, item.meetingType, item.date, item.dueDate].join(" "));
    return words.every((word) => text.includes(word));
  });
}
