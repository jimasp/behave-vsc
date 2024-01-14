Feature: Containing special chars like [\="'!@#$%^&*()_-+`~,./<>?{}|]

	Scenario: run a successful rx scenario = '
		Given we have behave installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a successful rx = "
		Given we have behave installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a successful rx scenario = #
		Given we have behave installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a successful rx scenario = $
		Given we have behave installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a successful rx scenario = $$
		Given we have behave installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a successful rx scenario = [\=
		Given we have (behave) installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a successful rx scenario = [\]$\!$
		Given we have behave installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a successful rx scenario = /[.*+?^${}()|[\]\$
		Given we have (behave) installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a successful rx scenario = [\="'!@#$%^&*()_-+`~,./<>?{}|]
		Given we have (behave) installed
		When "we" implement a [successful] test
		Then we will *see* the result
