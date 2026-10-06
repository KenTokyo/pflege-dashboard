/** Alltagssprache; alle Beispiele bleiben beim Lesen und Antworten im Chat. */
export const QUESTION_GROUPS = [
  {
    id: 'overview',
    label: 'Überblick bekommen',
    questions: [
      { title: 'Was ist gerade wichtig?', text: 'Geben Sie mir bitte einen kurzen Überblick zur ausgewählten Person. Was steht in den gespeicherten Angaben, und worum sollte ich mich als Nächstes kümmern?' },
      { title: 'Welche Informationen sind schon da?', text: 'Fassen Sie bitte zusammen, was über die ausgewählte Person hinterlegt ist: Pflegegrad, Pflegekasse, offene Aufgaben und vorhandene Unterlagen. Sagen Sie auch, welche Angaben fehlen.' },
      { title: 'Wo fange ich an?', text: 'Mir ist gerade alles etwas viel. Helfen Sie mir bitte, bei der Pflege den Überblick zu behalten. Nennen Sie mir drei kleine nächste Schritte anhand der vorhandenen Angaben.' },
    ],
  },
  {
    id: 'tasks',
    label: 'Aufgaben ordnen',
    questions: [
      { title: 'Was muss zuerst erledigt werden?', text: 'Ordnen Sie die offenen Aufgaben zur ausgewählten Person nach Dringlichkeit. Schreiben Sie dazu: zuerst erledigen, danach erledigen oder noch klären. Nutzen Sie nur die gespeicherten Termine und sagen Sie, wenn ein Datum fehlt.' },
      { title: 'Was steht diese Woche an?', text: 'Welche gespeicherten Aufgaben zur ausgewählten Person stehen diese Woche an? Zeigen Sie auch überfällige Aufgaben und nennen Sie für jede einen einfachen nächsten Schritt.' },
      { title: 'Eine einfache Liste für mich', text: 'Machen Sie mir hier im Chat eine kurze Checkliste aus den offenen Aufgaben zur ausgewählten Person. Was brauche ich dafür, und bei wem könnte ich nachfragen?' },
    ],
  },
  {
    id: 'explain',
    label: 'Einfach verstehen',
    questions: [
      { title: 'Was bedeutet der Pflegegrad?', text: 'Erklären Sie mir bitte in einfachen Worten, was der hinterlegte Pflegegrad der ausgewählten Person bedeutet. Welche Fragen sollte ich dazu mit der Pflegekasse klären?' },
      { title: 'Einen schwierigen Text erklären', text: 'Ich verstehe diesen Text nicht gut. Erklären Sie ihn bitte in einfachen Worten und sagen Sie, welche Punkte ich nachfragen sollte:\n\n[Hier den Text einfügen]' },
      { title: 'Welche Unterstützung kommt infrage?', text: 'Welche Arten von Unterstützung könnten zur Situation der ausgewählten Person passen? Erklären Sie es ohne Fachwörter. Nennen Sie passende offizielle Anlaufstellen und sagen Sie deutlich, was noch geprüft werden muss.' },
    ],
  },
  {
    id: 'writing',
    label: 'Ein Schreiben vorbereiten',
    questions: [
      { title: 'Bei der Pflegekasse nachfragen', text: 'Formulieren Sie mir hier im Chat einen freundlichen Textentwurf an die Pflegekasse der ausgewählten Person. Ich möchte nach dem Stand meines Anliegens fragen. Fragen Sie mich zuerst nach den fehlenden Angaben.' },
      { title: 'Einen Brief verständlicher machen', text: 'Helfen Sie mir bitte, diesen Text freundlich und verständlich zu formulieren. Die Bedeutung soll gleich bleiben:\n\n[Hier meinen Entwurf einfügen]' },
      { title: 'Einen Widerspruch vorbereiten', text: 'Ich möchte einen Widerspruch vorbereiten. Welche Angaben und Unterlagen sollte ich zusammentragen? Helfen Sie mir anschließend mit einem Textentwurf hier im Chat. Fragen Sie nach fehlenden Angaben und lassen Sie ungeprüfte Fristen offen.' },
    ],
  },
  {
    id: 'conversation',
    label: 'Ein Gespräch vorbereiten',
    questions: [
      { title: 'Fragen für die Pflegeberatung sammeln', text: 'Ich habe bald einen Termin bei der Pflegeberatung. Welche Fragen sollte ich zur ausgewählten Person mitnehmen? Nutzen Sie die vorhandenen Angaben und ordnen Sie die Fragen nach Thema.' },
      { title: 'Ein Telefonat vorbereiten', text: 'Ich möchte bei der Pflegekasse anrufen. Helfen Sie mir mit einer kurzen Gesprächsnotiz: Wie erkläre ich mein Anliegen, was frage ich und welche Angaben sollte ich bereithalten?' },
      { title: 'Die Familie auf den gleichen Stand bringen', text: 'Fassen Sie die Situation der ausgewählten Person für ein Gespräch in der Familie zusammen. Schreiben Sie kurz und verständlich: Was wissen wir, was ist offen und was sollten wir gemeinsam besprechen?' },
    ],
  },
] as const;

export function appendQuestion(draft: string, question: string): string {
  return draft.trim() ? `${draft}\n\n${question}` : question;
}
