# User story: learn a new flashcard set

**As a new learner**, I want to create an account, make a flashcard set, and complete Learn mode so I can check my recall and return to my saved progress.

## Scenario

1. I sign up with an email and password. I arrive at **My study sets**.
2. I create a private set named **Planet facts**. Its editor opens.
3. I add two cards: **Earth → Third planet from the Sun** and **Mars → Fourth planet from the Sun**. Both appear in the editor in that order.
4. I open **Learn mode**. The first card asks me to choose Earth's definition.
5. I choose the correct definition. The app asks me to type it.
6. I reload the page. Earth's written question is still waiting, which shows that the choice stage was saved.
7. I type the definition with different capitalization. The app marks Earth learned and advances to Mars.
8. I answer Mars's choice and written question. The app shows **2 of 2 learned** and a completion message.
9. I reload, sign out, and sign back in. My completed Learn session is still there.
10. I choose **Study again** whenever I want. The same set starts a fresh multiple-choice round with zero cards learned.

## Acceptance criteria

- A new account can reach its own set library and create a set with two ordered cards.
- Learn mode presents multiple choice before a written answer for each card.
- A correct choice survives a reload as the written stage.
- Written grading accepts capitalization differences.
- Completion survives reload and a new login for the same account.
- A learner can restart a completed set immediately, without waiting for a review date.

The Selenium test in [test_learn_journey.py](test_learn_journey.py) follows these steps through the browser. It creates a unique email on each run so previous local test data does not affect the result.
