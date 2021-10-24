// +--------------------------------------------------------------------+ \\
// ¦ BpmnJS 1.0 - BPMN2.0 rendering for JavaScript                      ¦ \\
// +--------------------------------------------------------------------¦ \\
// ¦ Copyright © 2013 Wolfgang Pleus http://www.pleus.net)              ¦ \\
// +--------------------------------------------------------------------+ \\
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Requires
// MLXJS   - http://xmljs.sourceforge.net/
// Raphael - http://raphaeljs.com/


//(function () {

// Namespace
var net = net || {}
net.pleus = {}
        
// Constructor
net.pleus.BpmnJS = function(canvas, highlighted){

  // List of element ids for highlighting
  this.highlighted = highlighted;
  
  // Paint canvas
  this.paper = Raphael(canvas, canvas.clientWidth, canvas.clientHeight);

  // BPMNDI namespace name
  this.bpmndi = "unknown";
}  

// Shared functions
net.pleus.BpmnJS.prototype = {

  plot: function(bpmn){                     

  	//initialize the W3C DOM Parser
  	var parser = new DOMImplementation();
  	var domDoc = parser.loadXML(bpmn);
  	var docRoot = domDoc.getDocumentElement();
    
    // resolve namespaces
	  this.resolveNamespaces(docRoot);
    
    // paint shapes	loop
    var shapes = docRoot.getElementsByTagName(this.bpmndi+":BPMNShape");

  	for(var i=0; i< shapes.length; i++){
  	  var shape = shapes.item(i);
      var bpmnElement = shape.getAttributes().getNamedItem('bpmnElement').getNodeValue();
  		var bounds = shape.getFirstChild();
  		var atts = bounds.getAttributes();
  		var x = atts.getNamedItem('x').getNodeValue();
  		var y = atts.getNamedItem('y').getNodeValue();
  		x = parseInt(x.substring(0,x.indexOf(".")+3));
  		y = parseInt(y.substring(0,y.indexOf(".")+3));
  		var height = parseInt(atts.getNamedItem('height').getNodeValue());
  		var width = parseInt(atts.getNamedItem('width').getNodeValue());
  		
  		this.paintShape(docRoot,bpmnElement,x,y,width,height);
  	}
  	
  	// paint edges loop
    var edges = docRoot.selectNodeSet("//"+this.bpmndi+":BPMNEdge");
  	
  	for(var i=0; i< edges.length; i++){
      var path = "";
      var edge = edges.item(i);
      var bpmnElement = edge.getAttributes().getNamedItem('bpmnElement').getNodeValue();
    		var childs = edge.getChildNodes();
          
      for(var t = 0;t < childs.length; t++){
    		var startX, startY;
        var atts1 = childs.item(t).getAttributes();
    		var x1 = atts1.getNamedItem('x').getNodeValue();
    		var y1 = atts1.getNamedItem('y').getNodeValue();
    		x1 = parseInt(x1.substring(0,x1.indexOf(".")+3));
    		y1 = parseInt(y1.substring(0,y1.indexOf(".")+3));
        if(path===""){
          path = "M" + x1 + " " + y1;
          startX = x1;
          startY = y1;
        }
        else{
    	    path += "L" + x1 + " " + y1;
        }
      }
  	  this.paintEdge(docRoot, bpmnElement, path, startX, startY);
    }
  },
  
  resolveNamespaces : function(docRoot){
    // namespace resolution is not possible using xmljs, so we do it the on our own
    var xmlns = 'xmlns:';
    var bpmnurl = '"http://www.omg.org/spec/BPMN/20100524/DI"';
    var definitions = docRoot.getElementsByTagName("definitions").item(0).toString();
	  var pattern = definitions.split(" ");
	  for(var s in pattern){ 
      var thepattern = pattern[s];  
	    if(thepattern.match("^"+xmlns)==xmlns)
        if(thepattern.match(bpmnurl+"$")==bpmnurl){
        	this.bpmndi = thepattern.substring(xmlns.length,thepattern.indexOf("="));
          break;
        }
      }
  },
  getElementName : function(element){
    var att = element.getAttributes().getNamedItem('name');
    var name = "";
    if (att){
      name = att.getNodeValue();
    }
    return name;
  },
  
  paintShape : function(docRoot, bpmnElement, x, y, width, height){
    var element = docRoot.selectNodeSet("//*[@id="+bpmnElement+"]").item(0);
         
    switch(element.localName){
      case "startEvent":
         this.paintStartEvent(x,y,width, height, element, element.localName, bpmnElement);
         break;
      case "endEvent":
         this.paintEndEvent(x,y,width, height, element, element.localName, bpmnElement);
         break;
      case "participant":
         this.paintParticipant(x,y,width, height, element);
         break;
      case "lane":
         this.paintLane(x,y,width, height, element);
         break;
      case "serviceTask":
      case "scriptTask":
      case "userTask":
      case "task":
         this.paintTask(x,y,width, height, element, element.localName, bpmnElement);
         break;
      case "sendTask":
         this.paintSendTask(x,y,width, height, element, element.localName, bpmnElement);
         break;
      case "receiveTask":
         this.paintReceiveTask(x,y,width, height, element, element.localName, bpmnElement);
         break;
      case "exclusiveGateway":
         this.paintExclusiveGateway(x,y,width, height, element);
         break;
      case "boundaryEvent":
         this.paintBoundaryEvent(x,y,width, height, element);
         break;
      case "subProcess":
         this.paintSubProcess(x,y,width, height, element);
         break;
      case "textAnnotation":
         this.paintTextAnnotation(x,y,width, height, element);
         break;
      case "dataStoreReference":
         this.paintDataStoreReference(x,y,width, height, element);
         break;
      default: 
         this.paintDefault(x,y,width, height, element);
         break;
    }
  },
 
  paintEdge : function(docRoot, bpmnElement, path, x, y){
    var element = docRoot.selectNodeSet("//*[@id="+bpmnElement+"]").item(0);
    var name = this.getElementName(element);
    
    var path = this.paper.path(path);
    if(element.localName == "messageFlow"){
      $(path.node).attr("stroke-dasharray","5,5");
    }
    path.attr({'arrow-end':'block-wide-long'});
    var css = this.getCss(bpmnElement, "edge")
    $(path.node).attr("class",css);
    this.paper.text(x+15,y+10,name);
  },
  
  paintParticipant : function(x, y, width, height,element){
    var name = this.getElementName(element);
    var shape = this.paper.rect(x, y, width, height);
    $(shape.node).attr("class","participant");
    this.paper.text(x+15,y+height/2,name).transform("r270");
  },
  paintLane : function(x, y, width, height,element){
    var shape = this.paper.rect(x, y, width, height);
    $(shape.node).attr("class","lane");
  },
  paintExclusiveGateway : function(x, y, width, height,element){
    var name = this.getElementName(element);
    var h2 = height/2;
    var w2 = width/2;     
    var w = width;
    var h = height;
    var path = "M"+(x+w2) + " " + (y) + "L"+(x+w) + " " +(y+h2) + "L"+(x+w2) + " " +(y+h) + "L"+(x) + " " +(y+h2) + "L"+(x+w2) + " " +(y);
    var shape = this.paper.path(path);
    this.paper.text(x+width/2,y+height/2,'X').attr({'font-size':16,'font-weight':'bold'});
    this.paper.text(x+width/2,y-10,name);
    $(shape.node).attr("class","exclusiveGateway");
  },
  paintStartEvent : function(x, y, width, height,element, elementType, bpmnElement){
    var shape = this.paper.circle(x+width/2, y+height/2, width/2);
    var css = this.getCss(bpmnElement, elementType)
    $(shape.node).attr("class",css);
  }, 
  paintBoundaryEvent : function(x, y, width, height,element){
    var shape = this.paper.circle(x+width/2, y+height/2, width/2);
    $(shape.node).attr("class","boundaryEvent");
  }, 
  paintEndEvent : function(x, y, width, height,element, elementType, bpmnElement){
    var shape = this.paper.circle(x+width/2, y+height/2, width/2);
    var css = this.getCss(bpmnElement, elementType)
    $(shape.node).attr("class",css);
  }, 
  paintTask : function(x, y, width, height, element, elementType, bpmnElement){
    // paint shape
    var shape = this.paper.rect(x, y, width, height, 5);
    var name = this.getElementName(element);
    // add text
    var re = new RegExp(' ', 'g');
    name = name.replace(re,'\n');
    this.paper.text(x+width/2,y+height/2,name);

    // add interactivity
    shape.hover(function(){shape.transform('S1.2')},function(){shape.transform('S1')})
    shape.click(function(){alert(name)});

    // apply css
    var css = this.getCss(bpmnElement, elementType)
    $(shape.node).attr("class",css);
  },
  paintReceiveTask : function(x, y, width, height, element, elementType, bpmnElement){
    // draw task shape
    this.paintTask(x, y, width, height, element, elementType, bpmnElement);
    // draw envelope
    this.paper.rect(x+10, y+10,20, 15);
    this.paper.path("M"+(x+10)+" "+(y+10)+"L"+(x+20)+" "+(y+20)+ "L" +(x+30)+" "+(y+10));
  },
  paintSendTask : function(x, y, width, height, element, elementType, bpmnElement){
    this.paintTask(x, y, width, height, element, elementType, bpmnElement);
    this.paper.rect(x+10, y+10,20, 15).attr("fill","black");
    this.paper.path("M"+(x+10)+" "+(y+10)+"L"+(x+20)+" "+(y+20)+ "L" +(x+30)+" "+(y+10)).attr("stroke","white");
  },
  paintSubProcess : function(x, y, width, height,element){
    var shape = this.paper.rect(x, y, width, height, 5);
    $(shape.node).attr("class","subProcess");
  },
  paintDataStoreReference : function(x, y, width, height,element){
    var shape = this.paper.rect(x, y, width, height, 5);
    $(shape.node).attr("class","dataStoreReference");
  },
  paintTextAnnotation : function(x, y, width, height,element){
    var shape = this.paper.rect(x, y, width, height);
    var text = element.getFirstChild().getFirstChild().getNodeValue();
    var re = new RegExp(' ', 'g');
    text = text.replace(re,'\n');
    this.paper.text(x+width/2,y+height/2,text).attr({'font-size':8});
    $(shape.node).attr("class","textAnnotation");
    $(this.paper.path("M"+x + " " + y + "L"+(x+width/2) + " " +y).node).attr("stroke-dasharray","5,5");
    $(this.paper.path("M"+x + " " + y + "L"+ x + " " +(y+height/2)).node).attr("stroke-dasharray","5,5");
  },
  paintDefault : function(x, y, width, height,element){
    var shape = this.paper.rect(x, y, width, height, 5);
    this.paper.text(x+5,y+5,element.localName);
    $(shape.node).attr("class","shape");
  },
  getCss: function(bpmnElement, cssClass){
    for(i in this.highlighted){
      if(this.highlighted[i] == bpmnElement){
        cssClass += "-high";
        break;
      }
    }
    return cssClass;
  }
}      

//}());
