# Prompt

Create a simple react native app that allows me to create a simple line drawing - no complex tools required

---

The clear button is hidden on android by the bottom controls. move it so it is wholly visible

---

Add a simple eraser that will selectively remove areas of the drawing. Control should pass between erase and draw control

---

Add a control that allows the user to change to color of the drawing tool. Pick a range of simple colours

---

Add a button or slider. When pressed or selected the button should add the sanskrit letter a to the canvas as a non-editable layer the opacity should be 50% & the character should be dashed. It should not be eraseable. The user should be able to practice writing the latter in a differnt eraseable layer

Make the guide 20% larger

Make the guide larger and centre on the canvas...I still want whitespace around the edge of the guide but optimize the use of space

---

Change the sanskrit letter guide button to add all sanskrit vowels as a choice that will present a guide on the canvas. Choose an appropriate control to do this

It's not clear from the selector that you can scroll make it apparent that you can slide left & right.

When a guide is chosen, the canvas should be cleared

---

Add a control to change the pen thickness. choose 3 thicknesses & label accordingly

The thickness control takes up too much screen space use a different control that is more compact

Hmm would a slider work better for the thickness control. consider accessibilty

----

In the canvas panel add a layer that presents the latin alphabet representation of the character including diacritic marks. Place it as a non editable layer bottom right hand corner

----

move the ink & pen controls into a collapsible panel

Make the vowel selector a bit larger

---- 

Change the drawing canvas so that a swipe action will move to the next vowel- with the drawing erased but the guide visble. The vowel selector should change at the same time to display the seleceted vowel

The swipe overrides drawing of a horizontal line, please fix (chage to 2 finger swipe)

---

TODO : How would you implement calculating the percentager of accuracy of a character vs the template?

```
’d score the drawing against the solid outline of the selected vowel, even though the displayed guide is dashed. The dashed gaps are visual styling, not part of the shape to match.

A practical approach:

Use one template source for display and scoring. The current guide is SVG text, which can vary by platform font. For consistent scores, use a fixed vector path for each vowel and render that same path as the dashed guide and as the scoring reference.

Compare geometry in canvas coordinates. Sample the learner’s strokes and the template outline into points. Keep the template’s position and size fixed so the score reflects how closely the user traced it.

Measure both completeness and precision.

Coverage: What fraction of the template is close to a learner stroke?
Precision: What fraction of the learner’s strokes is close to the template?
Count a point as close when it is within a small tolerance of the other line. Combine both with an F1-style score, so tracing only a small portion or adding unrelated marks lowers the result.

Show a percentage after the user finishes, not during every touch move. Don’t show a score until there’s enough drawing to assess.

The exact tolerance and formula are product choices, so I’d describe this as a trace similarity score, not an objective measure of handwriting quality. Stroke order and direction could be a later enhancement; they aren’t necessary for a useful first version.

The main implementation decision is the template source: fixed glyph paths make display and scoring reliable, but require defining the vowel outlines. Keeping platform-rendered text would be simpler, but could make scores vary across devices.
```
---

TODO - web is not correct alignment is top left and generally out of whack

---

add the sanskrit consonants to the list of available templates. This will add to the number of selectable options. consider rethinking the approach to selecting a character


---

Devanagri rules for writing consonant and a vowel are called Mātrā. Implement these as a new set of templated source that can be chosen to draw from - eg choose devanagri alphabet or Mātrā values 

---
Some of the templated Mātrā values do not fit into the canvas please fix

---

Add another list of consonants that implement the Virāma rule - no added vowel

I don't want it added to the alphabet list - i want it as a specific set of character grouping like the Mātrā set

----

Implement the most common Saṃyuktākṣara conjuncts - use this list to spearate them into separate groups 1. Important and common conjuncts
#	Conjunct	Components	IAST
1	क्ष	क् + ष	kṣa
2	त्र	त् + र	tra
3	ज्ञ	ज् + ञ	jña
4	श्र	श् + र	śra
5	क्त	क् + त	kta
6	त्त	त् + त	tta
7	द्ध	द् + ध	ddha
8	द्य	द् + य	dya
9	द्व	द् + व	dva
10	त्व	त् + व	tva

2. Conjuncts involving र (ra)
#	Conjunct	Components	IAST
11	क्र	क् + र	kra
12	ग्र	ग् + र	gra
13	प्र	प् + र	pra
14	ब्र	ब् + र	bra
15	द्र	द् + र	dra
16	भ्र	भ् + र	bhra
17	फ्र	फ् + र	phra
18	व्र	व् + र	vra
19	र्क	र् + क	rka
20	र्म	र् + म	rma

3. Nasal consonant combinations
#	Conjunct	Components	IAST
21	न्त	न् + त	nta
22	न्द	न् + द	nda
23	न्ध	न् + ध	ndha
24	न्न	न् + न	nna
25	म्प	म् + प	mpa
26	म्ब	म् + ब	mba
27	म्भ	म् + भ	mbha
28	ङ्क	ङ् + क	ṅka
29	ङ्ग	ङ् + ग	ṅga
30	ञ्च	ञ् + च	ñca

4. Conjuncts involving स, श and ष
#	Conjunct	Components	IAST
31	स्त	स् + त	sta
32	स्थ	स् + थ	stha
33	स्न	स् + न	sna
34	स्म	स् + म	sma
35	स्व	स् + व	sva
36	स्क	स् + क	ska
37	श्च	श् + च	śca
38	श्न	श् + न	śna
39	ष्ट	ष् + ट	ṣṭa
40	ष्ठ	ष् + ठ	ṣṭha

5. Other useful conjuncts
#	Conjunct	Components	IAST
41	च्च	च् + च	cca
42	च्छ	च् + छ	ccha
43	ज्ज	ज् + ज	jja
44	त्न	त् + न	tna
45	त्म	त् + म	tma
46	त्य	त् + य	tya
47	न्य	न् + य	nya
48	प्य	प् + य	pya
49	ल्ल	ल् + ल	lla
50	स्त्र	स् + त् + र	stra 

---
For the grouped Items I now have to select twice to get the items to dsiplay on the canvas- feels a bit from a usability perspective. Selecting a list or lesson should feault the canvas to that list