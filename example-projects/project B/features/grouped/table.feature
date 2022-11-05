Feature: Table feature

	Scenario: Use a table (success)
		Given we add a set of users:
			| user    | dept    |
			| Bob     | Testers |
			| Dave    | Devs    |
			| Sharon  | Devs    |
		When we do nothing
		Then we will find 2 people in "Devs"
		But we will find 1 person in "Testers"

	Scenario: Use a table (fail)
		Given we add a set of users:
			| user   | dept     |
			| Vic    | Testers  |
			| Helen  | Devs     |
			| Dick   | Devs     |
		When we do nothing
		Then we will find 25 people in "Testers"
