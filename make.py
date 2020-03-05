"""Construit le site Explorer et comprendre l'Univers, incluant les diapositives
et le livre.  Le logiciel Pandoc est utilisé pour obtenir des présentations
dans différents formats.

On peut construire tous les fichiers html avec la commande

    $ python make.py

"""

import subprocess
import os
import sys

# Dossiers de présentation
DIAPOS_DIRS = [os.path.join('diapos', d) for d in os.listdir('diapos')
               if d != 'reveal.js']


def run(call_str):
    """Exécute la chaîne de caractère sur la ligne de commande."""
    try:
        subprocess.check_call(call_str.split())
        print("complet!")
    except subprocess.CalledProcessError as e:
        print(call_str, end='... ')
        print("erreur, la compilation a échoué")


def revealjs(in_fname, out_fname):
    """Crée une présentation avec la librairie javascript Reveal.js."""
    call_str = "pandoc -t revealjs " \
               "-V revealjs-url=../reveal.js -s " \
               "--slide-level=1 " \
               "--mathjax {} -o {}".format(in_fname, out_fname)
    run(call_str)


def diapos():
    """Construits les fichiers HTML des diapositives."""
    cwd = os.getcwd()
    for folder in DIAPOS_DIRS:
        try:
            os.chdir(folder)
        except (FileNotFoundError, NotADirectoryError):
            os.chdir(cwd)
            continue
        # Déterminer le nom du fichier source.
        for fname in os.listdir():
            if fname.endswith(".md"):
                break
        else:
            os.chdir(cwd)
            continue
        in_fname = fname
        out_fname = "{}.html".format(os.path.splitext(os.path.basename(fname))[0])
        print("{}: ".format(folder), end='')
        revealjs(in_fname, out_fname)
        os.chdir(cwd)


def livre():
    """Constuit les fichiers HTML du livre."""
    for fname in os.listdir('livre'):
        if not fname.endswith('.md'):
            continue
        in_fname = os.path.join('livre', fname)
        out_fname = os.path.join(
            'livre',
            '{}.html'.format(os.path.splitext(os.path.basename(fname))[0]))
        call_str = 'pandoc -s -c ../www/style.css --mathjax ' \
                   '--template www/book-template.html ' \
                   '{} -o {}'.format(in_fname, out_fname)
        print("{}: ".format(in_fname), end='')
        run(call_str)


if __name__ == '__main__':
    if len(sys.argv) != 1:
        print("usage: python make.py\n")
        exit()
    diapos()
    livre()
