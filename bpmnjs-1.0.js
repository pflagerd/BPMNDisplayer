// Namespace
let net = {}
net.pflager = {}

// Constructor
net.pflager.BpmnJS = class {
    constructor(canvas, highlighted) {
        // List of element ids for highlighting
        this.highlighted = highlighted;

        // Paint canvas
        this.paper = Raphael(canvas, canvas.clientWidth, canvas.clientHeight);

        // BPMNDI namespace name
        this.bpmndi = "unknown";
    }

    plot(bpmn) {
        //initialize the W3C DOM Parser
        let parser = new DOMImplementation();
        let domDoc = parser.loadXML(bpmn);
        let docRoot = domDoc.getDocumentElement();

        // resolve namespaces
        this.resolveNamespaces(docRoot);

        // paint shapes	loop
        let shapes = docRoot.getElementsByTagName(this.bpmndi + ":BPMNShape");

        for (let i = 0; i < shapes.length; i++) {
            let shape = shapes.item(i);
            let bpmnElement = shape.getAttributes().getNamedItem('bpmnElement').getNodeValue();
            let bounds = shape.getFirstChild();
            let attributes = bounds.getAttributes();
            let x = attributes.getNamedItem('x').getNodeValue();
            let y = attributes.getNamedItem('y').getNodeValue();
            x = parseInt(x.substring(0, x.indexOf(".") + 3));
            y = parseInt(y.substring(0, y.indexOf(".") + 3));
            let height = parseInt(attributes.getNamedItem('height').getNodeValue());
            let width = parseInt(attributes.getNamedItem('width').getNodeValue());

            this.paintShape(docRoot, bpmnElement, x, y, width, height);
        }

        // paint edges loop
        let edges = docRoot.selectNodeSet("//" + this.bpmndi + ":BPMNEdge");

        for (let i = 0; i < edges.length; i++) {
            let path = "";
            let edge = edges.item(i);
            let bpmnElement = edge.getAttributes().getNamedItem('bpmnElement').getNodeValue();
            let childNodes = edge.getChildNodes();

            let startX, startY;
            for (let t = 0; t < childNodes.length; t++) {
                let attributes = childNodes.item(t).getAttributes();
                let x1 = attributes.getNamedItem('x').getNodeValue();
                let y1 = attributes.getNamedItem('y').getNodeValue();
                x1 = parseInt(x1.substring(0, x1.indexOf(".") + 3));
                y1 = parseInt(y1.substring(0, y1.indexOf(".") + 3));
                if (path === "") {
                    path = "M" + x1 + " " + y1;
                    startX = x1;
                    startY = y1;
                } else {
                    path += "L" + x1 + " " + y1;
                }
            }
            this.paintEdge(docRoot, bpmnElement, path, startX, startY);
        }
    }

    resolveNamespaces(docRoot) {
        // namespace resolution is not possible using xmljs, so we do it the on our own
        let xmlns = 'xmlns:';
        let bpmndi = '"http://www.omg.org/spec/BPMN/20100524/DI"';
        let definitions = docRoot.getElementsByTagName("definitions").item(0).toString();
        let patterns = definitions.split(" ");
        for (let s in patterns) {
            let pattern = patterns[s];
            let match = pattern.match("^" + xmlns);
            if (match !== null && match[0] === xmlns)
                match = pattern.match(bpmndi + "$");
                if (match !== null && match[0] === bpmndi) {
                    this.bpmndi = pattern.substring(xmlns.length, pattern.indexOf("="));
                    break;
                }
        }
    }

    getElementName(element) {
        let att = element.getAttributes().getNamedItem('name');
        let name = "";
        if (att) {
            name = att.getNodeValue();
        }
        return name;
    }

    paintShape(docRoot, bpmnElement, x, y, width, height) {
        let element = docRoot.selectNodeSet("//*[@id=" + bpmnElement + "]").item(0);

        switch (element.localName) {
            case "startEvent":
                this.paintStartEvent(x, y, width, height, element, element.localName, bpmnElement);
                break;
            case "endEvent":
                this.paintEndEvent(x, y, width, height, element, element.localName, bpmnElement);
                break;
            case "participant":
                this.paintParticipant(x, y, width, height, element);
                break;
            case "lane":
                this.paintLane(x, y, width, height, element);
                break;
            case "serviceTask":
            case "scriptTask":
            case "userTask":
            case "task":
                this.paintTask(x, y, width, height, element, element.localName, bpmnElement);
                break;
            case "sendTask":
                this.paintSendTask(x, y, width, height, element, element.localName, bpmnElement);
                break;
            case "receiveTask":
                this.paintReceiveTask(x, y, width, height, element, element.localName, bpmnElement);
                break;
            case "exclusiveGateway":
                this.paintExclusiveGateway(x, y, width, height, element);
                break;
            case "boundaryEvent":
                this.paintBoundaryEvent(x, y, width, height, element);
                break;
            case "subProcess":
                this.paintSubProcess(x, y, width, height, element);
                break;
            case "textAnnotation":
                this.paintTextAnnotation(x, y, width, height, element);
                break;
            case "dataStoreReference":
                this.paintDataStoreReference(x, y, width, height, element);
                break;
            default:
                this.paintDefault(x, y, width, height, element);
                break;
        }
    }

    paintEdge(docRoot, bpmnElement, path, x, y) {
        let element = docRoot.selectNodeSet("//*[@id=" + bpmnElement + "]").item(0);
        let name = this.getElementName(element);

        path = this.paper.path(path);
        if (element.localName === "messageFlow") {
            $(path.node).attr("stroke-dasharray", "5,5");
        }
        path.attr({'arrow-end': 'block-wide-long'});
        let css = this.getCss(bpmnElement, "edge")
        $(path.node).attr("class", css);
        if (name.trim().length !== 0)
            this.paper.text(x + 10, y + 8, name.trim());
    }

    paintParticipant(x, y, width, height, element) {
        let name = this.getElementName(element);
        let shape = this.paper.rect(x, y, width, height);
        $(shape.node).attr("class", "participant");
        this.paper.text(x + 15, y + height / 2, name).transform("r270");
    }
    paintLane(x, y, width, height, element) {
        let shape = this.paper.rect(x, y, width, height);
        $(shape.node).attr("class", "lane");
    }
    paintExclusiveGateway(x, y, width, height, element) {
        let name = this.getElementName(element);
        let h2 = height / 2;
        let w2 = width / 2;
        let path = "M" + (x + w2) + " " + (y) + "L" + (x + width) + " " + (y + h2) + "L" + (x + w2) + " " + (y + height) + "L" + (x) + " " + (y + h2) + "L" + (x + w2) + " " + (y);
        let shape = this.paper.path(path);
        this.paper.text(x + width / 2, y + height / 2, 'X').attr({'font-size': 16, 'font-weight': 'bold'});
        this.paper.text(x + width / 2, y - 10, name);
        $(shape.node).attr("class", "exclusiveGateway");
    }
    paintStartEvent(x, y, width, height, element, elementType, bpmnElement) {
        let shape = this.paper.circle(x + width / 2, y + height / 2, width / 2);
        let css = this.getCss(bpmnElement, elementType)
        $(shape.node).attr("class", css);
    }
    paintBoundaryEvent(x, y, width, height, element) {
        let shape = this.paper.circle(x + width / 2, y + height / 2, width / 2);
        $(shape.node).attr("class", "boundaryEvent");
    }
    paintEndEvent(x, y, width, height, element, elementType, bpmnElement) {
        let shape = this.paper.circle(x + width / 2, y + height / 2, width / 2);
        let css = this.getCss(bpmnElement, elementType)
        $(shape.node).attr("class", css);
    }
    paintTask(x, y, width, height, element, elementType, bpmnElement) {
        // paint shape
        let shape = this.paper.rect(x, y, width, height, 5);
        let name = this.getElementName(element);
        // add text
        let re = new RegExp(' ', 'g');
        name = name.replace(re, '\n');
        this.paper.text(x + width / 2, y + height / 2, name);

        // add interactivity
        shape.hover(function () {
            shape.transform('S1.2')
        }, function () {
            shape.transform('S1')
        })

        shape.click(function () {
            alert(name)
        });

        // apply css
        let css = this.getCss(bpmnElement, elementType)
        $(shape.node).attr("class", css);
    }
    paintReceiveTask(x, y, width, height, element, elementType, bpmnElement) {
        // draw task shape
        this.paintTask(x, y, width, height, element, elementType, bpmnElement);
        // draw envelope
        this.paper.rect(x + 10, y + 10, 20, 15);
        this.paper.path("M" + (x + 10) + " " + (y + 10) + "L" + (x + 20) + " " + (y + 20) + "L" + (x + 30) + " " + (y + 10));
    }
    paintSendTask(x, y, width, height, element, elementType, bpmnElement) {
        this.paintTask(x, y, width, height, element, elementType, bpmnElement);
        this.paper.rect(x + 10, y + 10, 20, 15).attr("fill", "black");
        this.paper.path("M" + (x + 10) + " " + (y + 10) + "L" + (x + 20) + " " + (y + 20) + "L" + (x + 30) + " " + (y + 10)).attr("stroke", "white");
    }
    paintSubProcess(x, y, width, height, element) {
        let shape = this.paper.rect(x, y, width, height, 5);
        $(shape.node).attr("class", "subProcess");
    }
    paintDataStoreReference(x, y, width, height, element) {
        let shape = this.paper.rect(x, y, width, height, 5);
        $(shape.node).attr("class", "dataStoreReference");
    }
    paintTextAnnotation(x, y, width, height, element) {
        let shape = this.paper.rect(x, y, width, height);
        let text = element.getFirstChild().getFirstChild().getNodeValue();
        let re = new RegExp(' ', 'g');
        text = text.replace(re, '\n');
        this.paper.text(x + width / 2, y + height / 2, text).attr({'font-size': 8});
        $(shape.node).attr("class", "textAnnotation");
        $(this.paper.path("M" + x + " " + y + "L" + (x + width / 2) + " " + y).node).attr("stroke-dasharray", "5,5");
        $(this.paper.path("M" + x + " " + y + "L" + x + " " + (y + height / 2)).node).attr("stroke-dasharray", "5,5");
    }
    paintDefault(x, y, width, height, element) {
        let shape = this.paper.rect(x, y, width, height, 5);
        this.paper.text(x + 5, y + 5, element.localName);
        $(shape.node).attr("class", "shape");
    }
    getCss(bpmnElement, cssClass) {
        for (let i in this.highlighted) {
            if (this.highlighted[i] === bpmnElement.toString()) {
                cssClass += "-high";
                break;
            }
        }
        return cssClass;
    }
}

$(document).ready(function () {
    let highlight = [
        "sid-C5DEA22B-2768-4A0D-BDDC-50D4645D75DD",
        "sid-8BFCBA5C-E772-4F6E-BCA7-873CA44B369F",
        "sid-E0C185CF-D3D7-45A4-B294-E8CC5334A283",
        "sid-64C9B4DB-F8E8-410A-9439-FCADAC5393AE",
        "sid-2294910A-71B7-4FB7-9301-F64298377F67",
        "sid-A291BF37-420D-4854-B471-41F3BE6028AF",
        "sid-20D1A397-8996-4362-913F-C177BE3CEE04",
        "sid-89EFC2E3-AD25-4DD4-9F67-083B31F27CF8",
        "sid-B6240BCC-F776-497E-97AF-7CFC9418686D",
        "sid-77732534-FD07-49E9-B035-676A73EAF489",
        "sid-67B68745-2B36-456A-9B22-945CC9DE3C7B",
        "sid-97421847-B87C-4AF0-B055-E876911A8D9A",
        "sid-B8685999-52B2-413C-A78D-30864A7191CE",
        "sid-D6CB4A5D-1CA0-4B98-BABB-65200C63EED5",
        "sid-A119DD42-80EB-4D01-A7A4-CFFEEB90A3BA",
        "sid-F1CFA9F0-1745-45DC-B0AC-050A4F6E8571"];

    fetch("order.bpmn", {cache: "no-cache"})
        .then(response => response.text())
        .then(function (bpmn) {
            console.log(bpmn);
            new net.pflager.BpmnJS($('#canvas')[0], highlight).plot(bpmn);
        });
});
