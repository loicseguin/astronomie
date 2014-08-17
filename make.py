#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Construit une présentation à partir d'un fichier source écrit en Markdown.
# Le logiciel Pandoc est utilisé pour obtenir des présentations dans différents
# formats.

import subprocess
import os
import sys

# Style de présentation par défaut.
DEFAULT_STYLE = "revealjs"

# Dossiers de présentation
DIRS = ['prologue'] + ['chap{:02d}'.format(i) for i in range(13)]

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
               "--slide-level=1 " \
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
    if len(sys.argv) == 1:
        style = DEFAULT_STYLE
    elif sys.argv[1] in dir(sys.modules[__name__]):
        style = sys.argv[1]
    else:
        print("usage: make.py OUTTYPE\n"
              "     where OUTTYPE is one of revealjs, slidy")
        exit()
    cwd = os.getcwd()
    for folder in DIRS:
        try:
            os.chdir(folder)
        except FileNotFoundError:
            os.chdir(cwd)
            continue
        # Déterminer le nom du fichier source.
        for fname in os.listdir():
            if fname.endswith(".md"):
                break
        else:
            os.chdir(cwd)
            continue
        infname = fname
        outfname = "{}.html".format(os.path.splitext(os.path.basename(fname))[0])
        print("{}: ".format(folder), end='')
        exec("{}()".format(style))
        os.chdir(cwd)
