import sys
from behave.__main__ import main as behave_main

def __main__():
    args = sys.argv[2:]
    print(f'script: behave {" ".join(args)}\n')
    sys.exit(behave_main(args))

if __name__ == "__main__":
    __main__()