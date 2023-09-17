Feature: Outline success

Scenario Outline: Blend Success
   Given I put "<thing>" in a blender
   When I switch the blender on
   Then it should transform into "<other thing>"

Examples: Amphibians
   | thing         | other thing |
   | Red Tree Frog | mush        |

Examples: Consumer Electronics
   | thing         | other thing |
   | iPhone        | toxic waste |
   | Galaxy Nexus  | toxic waste |


Scenario Outline: Blend Success 2
   Given I put "<thing>" in a blender
   When I switch the blender on
   Then it should transform into "<other thing>"

Examples: Amphibians
   | thing         | other thing |
   | Red Tree Frog | mush        |

Examples: Consumer Electronics
   | thing         | other thing |
   | iPhone        | toxic waste |
   | Galaxy Nexus  | toxic waste |   