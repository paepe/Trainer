# Was sich am Trainingsgenerator geändert hat — Hinweis für den Trainer

**Datum:** 2026-07-31 · **In Produktion** · Anlass: Rückmeldung von Kamil (2026-07-30)

## Was du gemeldet hast

Dass die KI **einzelne Übungen liefert, keine Einheit**. Eine Liste von Hauptübungen, ohne Aufwärmen, ohne Technik und ohne Abwärmen — und ohne die 45 Minuten des Kunden auszufüllen.

Du hattest recht. Und es waren drei verschiedene Probleme, nicht eines.

## Was wir gefunden haben

**1. Der Einheit fehlte die Struktur.** Der Generator war nie angewiesen, eine Einheit aufzubauen — nur Übungen vorzuschlagen. In deinem Screenshot: Kniebeuge, Bankdrücken, Rudern, Schulterdrücken, Plank und Laufband. Sechs Hauptübungen, nichts Vorbereitendes, nichts zur Erholung.

**2. Die Einheit nutzte die Zeit des Kunden nicht.** Dasselbe Training ergab rund **26 der verfügbaren 45 Minuten**. Der Kunde plant 45 ein und bekommt eine Vorgabe für 26. Ursache war eine abweichende Rechnung: Generator und App schätzten die Dauer eines Satzes unterschiedlich.

**3. Deine Methodik war hinterlegt und wurde ignoriert.** In der Coach DNA hattest du deine Reihenfolge längst definiert — *Aufwärmen → Mobilität → Technik → Kraft → Konditionierung → Abwärmen*. Der Generator hat das nie gelesen. Die Information lag im System und erreichte die KI nicht.

## Was sich geändert hat

**Die KI baut die Einheit jetzt in DEINER Reihenfolge.** Nicht in einer generischen Struktur, sondern in der Sequenz, die du in der Coach DNA hinterlegt hast — einschließlich des **Technik**-Blocks, den du angesprochen hast.

In Produktion gemessen, in deiner Sprache, drei Generierungen für 45 Minuten:

| Übungen | Erzeugte Sequenz | Vorgegebene Zeit |
|---|---|---|
| 14 | Aufwärmen → Mobilität → Technik → Kraft → Konditionierung → Abwärmen | 43 Min. |
| 13 | Aufwärmen → Mobilität → Technik → Kraft → Konditionierung → Abwärmen | 48 Min. |
| 9 | Aufwärmen → Mobilität → Technik → Kraft → Konditionierung → Abwärmen | 42 Min. |

Im Vergleich zu deinem Screenshot: von 6 Übungen und 26 Minuten auf 9–14 Übungen, die das gesamte Zeitfenster ausfüllen — in deiner Reihenfolge.

**Die Zeit des Kunden ist jetzt das Ziel.** Die Einheit liegt zwischen 90 % und 110 % der Verfügbarkeit. Bleibt Zeit übrig, ergänzt die KI; wird sie überschritten, kürzt das System — und zwar ausschließlich in den Arbeitsblöcken. Aufwärmen, Mobilität, Technik und Abwärmen sind vorgegeben: die Zeitanpassung entfernt sie nie und löscht nie einen von dir deklarierten Block vollständig.

**Du und die KI arbeiten zusammen.** Wenn du 3 Übungen mit zusammen 20 Minuten anlegst und die KI ergänzen lässt, erhält sie genau die verbleibenden 25 — und ergänzt nur die Arbeitsblöcke, ohne ein Aufwärmen mitten in deine Vorgabe zu setzen.

**Zeithinweis auf dem Bildschirm.** Liegt das Training deutlich unter der Verfügbarkeit des Kunden oder darüber, erscheint ein Hinweis mit den Zahlen. Er informiert nur und blockiert nichts. Die Entscheidung bleibt bei dir.

**Vorgabe nach Zeit.** Haltezeiten in Sekunden statt Wiederholungen sind möglich — für Plank, Isometrie und Atemübungen.

**Die verfügbare Zeit wird jetzt immer angezeigt.** Hatte der Kunde beim Tages-Check-in keine Zeit angegeben, zeigte der Bildschirm bisher gar nichts — obwohl das System den üblichen Wert aus seinem Profil bereits verwendete. Jetzt erscheint die Zahl, mit Angabe der Quelle.

**Fehler sind nicht mehr stumm.** Schlug das Senden eines Trainings an den Kunden fehl, passierte bisher schlicht nichts. Jetzt wird der Fehler angezeigt, und kein Training erreicht den Kunden halb fertig.

## Was sich noch nicht geändert hat

**Es gibt keine visuellen Trennlinien.** Die Einheit kommt in der richtigen Reihenfolge und du erkennst jeden Block an den Übungen, aber es fehlen noch Überschriften, die Aufwärmen, Technik, Kraft usw. voneinander abgrenzen. Das ist der nächste geplante Schritt.

**Die Zeitschätzung ist eine Konvention.** Das System rechnet je Satz mit einem Standardmittelwert plus der von dir vorgegebenen Pause. Ein Satz mit 8 schweren Kniebeugen und einer mit 20 leichten Wiederholungen werden ähnlich gewertet. Das dient der Dimensionierung der Einheit, nicht der Zeitmessung während der Ausführung.

## Worum wir dich bitten

Erzeuge ein paar Trainings und sag uns, ob Umfang und Aufteilung aus trainingsmethodischer Sicht stimmen. Das System stellt sicher, dass die Einheit vollständig ist, deiner Reihenfolge folgt und in die Zeit passt — **ob sie gut vorgegeben ist, beurteilst du.**

Besonders interessiert uns: Stimmt das Verhältnis zwischen Vorbereitung, Hauptteil und Abwärmen? Passen die vorbereitenden Übungen zur nachfolgenden Arbeit? Und wenn du deine Reihenfolge in der Coach DNA änderst, zieht der Generator mit — das ist einen Test wert.
