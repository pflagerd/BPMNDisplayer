.PHONY: all

all:
	html-inline -i BPMNDisplayer.html -o demo.html

dev:
	live-server --ignore=node_modules/ --open=BPMNDisplayer.html
