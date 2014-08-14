#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Construit une présentation à partir d'un fichier source écrit en Markdown.
# Le logiciel Pandoc est utilisé pour obtenir des présentations dans différents
# formats.

import subprocess
from os import listdir
from os.path import basename, splitext
from sys import argv, modules

# Déterminer le nom du fichier source.
for fname in listdir():
    if fname.endswith(".md"):
        break

infname = fname
outfname = "{}.html".format(splitext(basename(fname))[0])

def run(call_str):
    try:
        subprocess.check_call(call_str.split())
        print("done!")
    except subprocess.CalledProcessError as e:
        print(call_str, end='... ')
        print("there was an error, build failed")

def revealjs():
    # Produit une présentation html avec la librairie javascript reveal.js.
    call_str = "pandoc -t revealjs " \
               "-V revealjs-url=../reveal.js -s " \
               "-V transition=linear " \
               "-V theme=serif " \
               "--mathjax {infname} -o {outfname}".format(infname=infname,
                outfname=outfname)
    run(call_str)

def slidy():
    call_str = "pandoc -t slidy --mathjax -s " \
               "{infname} -o {outfname}".format(infname=infname,
                       outfname=outfname)
    run(call_str)

def dzslides():
    call_str = "pandoc -t dzslides --mathjax -s " \
               "{infname} -o {outfname}".format(infname=infname,
                       outfname=outfname)
    run(call_str)

def s5():
    call_str = "pandoc -t s5 --mathjax -s " \
               "{infname} -o {outfname}".format(infname=infname,
                       outfname=outfname)
    run(call_str)

def slideous():
    call_str = "pandoc -t slideous --mathjax -s " \
               "{infname} -o {outfname}".format(infname=infname,
                       outfname=outfname)
    run(call_str)

if __name__ == '__main__':
    if len(argv) > 1 and argv[1] in dir(modules[__name__]):
        exec("{}()".format(argv[1]))
    else:
        print("usage: make.py OUTTYPE\n"
              "     where OUTTYPE is one of revealjs, slidy")
