Feature: Outline success

Scenario Outline: Blend Success
   Given I put "<thing>" in a blender
    when I switch the blender on
    then it should transform into "<other thing>"

Examples: Amphibians
   | thing         | other thing |
   | Red Tree Frog | mush        |

Examples: Consumer Electronics
   | thing         | other thing |
   | iPhone        | toxic waste |
   | Galaxy Nexus  | toxic waste |


Scenario Outline: Blend Success 2
   Given I put "<thing>" in a blender
    when I switch the blender on
    then it should transform into "<other thing>"

Examples: Amphibians
   | thing         | other thing |
   | Red Tree Frog | mush        |

Examples: Consumer Electronics
   | thing         | other thing |
   | iPhone        | toxic waste |
   | Galaxy Nexus  | toxic waste |   