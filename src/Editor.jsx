import { useEffect, useState } from "react"
import Container from "./Container"

/**
 * @param {Object} param0 
 * @param {string} param0.width 
 * @param {string} param0.height 
 * @param {string} param0.className 
 * @param {string} [param0.editorId="txtarea"] 
 * @param {string} [param0.previewId="preview"] 
 * @param {boolean} [param0.showPreview=true] 
 * @param {(html: string, md: string) => {}} param0.onContentChange 
 * @param {import("react").Ref} param0.ref 
 * @param {boolean} param0.saveDraft 
 * @param {boolean} param0.useIdAsRef 
 * @param {Object} param0.textareaStyle 
 * @param {Object} param0.previewStyle 
 */
export default function Textfield ({
        width, 
        height, 
        className, 
        editorId = "txtarea", 
        previewId = "preview", 
        editorValue,
        showPreview = true, 
        onContentChange,
        ref,
        saveDraft,
        useIdAsRef,
        textareaStyle,
        previewStyle
    }) {

    const textareaTagStyle = {
        width: width || "500px",
        height: height || "300px",
        resize: "none",
        outline: "none",
        border: "1px solid lightgray",
        overflow: "auto",
        padding: "10px",
        fontFamily: "monospace",
        borderRadius: "3px",
        ...textareaStyle
    };

    const previewTagStyle = {
        width: width || "500px",
        height: height || "300px",
        resize: "none",
        outline: "none",
        border: "1px solid lightgray",
        overflow: "auto",
        padding: "10px",
        ...previewStyle
    };

    useEffect(() => {
        const init = () => {
            const textarea = document.querySelector( useIdAsRef ? `#${editorId}` : `.${className}`);
            const preview = document.querySelector( useIdAsRef ? `#${previewId}` : ".preview");
            const draft = localStorage.getItem("draft");

            // textarea.addEventListener("paste", function(e) {
            //     e.preventDefault();
            //     const text = e.clipboardData?.getData("text/plain").replace(/\r/g, "");

            //     const selection = window.getSelection();
            //     if (!selection || !selection.rangeCount) return;

            //     const range = selection.getRangeAt(0);
            //     range.deleteContents();
            //     range.insertNode(document.createTextNode(text));
            //     range.collapse(false);
            // });

            textarea.addEventListener("keydown", function(e) {
                // if (e.key == 'Tab') {
                //     e.preventDefault();

                //     const selection = window.getSelection();
                //     if (!selection.rangeCount) return;

                //     const range = selection.getRangeAt(0);
                //     const selectedParagraph = range.startContainer.parentElement.closest("p");
                // }
            })

            let timeout;
            textarea.addEventListener("keyup", () => {
                const value = editorValue || textarea.innerText;
                const parsedText = parseText(value);
                const tree = populateTree(parsedText);
                const html = formatText(tree);
                if (onContentChange && typeof onContentChange === "function") onContentChange(html, value);
                if (showPreview) preview.innerHTML = html;

                const valueHTML = textarea.innerHTML;

                if (saveDraft) {
                    if (timeout) clearTimeout(timeout);

                    timeout = setTimeout(() => {
                        localStorage.setItem("draft", valueHTML);
                        const now = new Date()
                        const formatted = `${String(now.getDate()).padStart(2, '0')}/` +
                        `${String(now.getMonth() + 1).padStart(2, '0')}/` +
                        `${now.getFullYear()} ` +
                        `${String(now.getHours()).padStart(2, '0')}:` +
                        `${String(now.getMinutes()).padStart(2, '0')}:` +
                        `${String(now.getSeconds()).padStart(2, '0')}`;
                        document.getElementById("audit-data").innerHTML = `<span style="color: green;font-size: 11px;"><em>Draft saved at ${formatted}!</em></span>`
                        console.log(`Draft saved - ${formatted}`);
                    }, 3000);

                    if (draft){
                        textarea.innerHTML = draft;
                        const event = new KeyboardEvent("keyup", {
                            key: "ArrowRight",
                            bubbles: true,
                            cancelable: true
                        });
                        textarea.dispatchEvent(event);
                    }
                }
                
            });

            

            
        }
        const parseInline = line => {
            const regex = /```([^`]+)```|`([^`]+)`|\[fg:([#\w]+|\brgba?\([^)]+\))\](.*?)\[\/fg\]|(\[([^\]]+)\]\(([^\)]+)\))|(\*\*|_{1,2}|[^`\[\]\*_]+|\(|\))/g;
            const inline = Array.from(line.matchAll(regex)).map(match => {
                const [_, blockCode, inlineCode, textFgCol, coloredText, link, linkDisplay, linkUrl, text] = match
                if (link && linkUrl) {
                    if (linkDisplay.startsWith("img")) {
                        return {
                            type: "image",
                            alt: linkDisplay.split(":").at(1),
                            src: linkUrl,
                            width: linkDisplay.split(":").at(0).split("-").at(-1)
                        }
                    }
                    return {
                        type: "hyperlink",
                        text: linkDisplay,
                        href: linkUrl
                    }
                }

                if (coloredText){
                    return {
                        type: "coloredText",
                        value: parseInline(coloredText),
                        fgcolor: textFgCol
                    }
                }

                if (blockCode){
                    return {type: "blockCode", value: blockCode}
                }

                if (inlineCode) {
                    return {type: "inlineCode", value: inlineCode}
                }

                if (text === '**' || text === '_' || text === '__') return {type: text, value:text}

                return {type: "text", value:text}
            });

            return inline;
        }

        /**
         * @param {string} text 
         */
        const parseText = (text) => {
            const lines = [];
            let insideCodeBlock = false;
            let buffer = [];

            for (const line of text.split('\n')) {
                if (line.trim().startsWith('```')) {
                    buffer.push(line);
                    insideCodeBlock = !insideCodeBlock;

                    if (!insideCodeBlock) {
                        lines.push(buffer.join('\n'));
                        buffer = [];
                    }
                } else if (insideCodeBlock) {
                    buffer.push(line);
                } else {
                    lines.push(line);
                }
            }

            if (buffer.length > 0) {
                lines.push(buffer.join('\n'));
            }
            const output = [];
            let listBuffer = [];
            for (let line of lines) {
                const heading = line.match(/^(#{1,6})\s+(.*)$/)
                const ulItem = line.match(/^-\s+(.*)$/);
                const alignment = /^\[\[!align:(\w+)\]\]/;
                const alignText = line.match(alignment);
                if (alignText) {
                    line = line.replace(alignment, "")
                }

                if (heading) {
                    output.push({
                        type: 'heading',
                        level: heading[1].length,
                        content: heading[2]
                    });
                    
                    if (listBuffer.length > 0) {
                        output.push({ type: 'ul', items: listBuffer });
                        listBuffer = [];
                    }
                } else if (line.trim() === '') {

                    if (listBuffer.length > 0) {
                        output.push({ type: 'ul', items: listBuffer });
                        listBuffer = [];
                    }

                    output.push({type: 'newline'});
                } else if (ulItem) {
                    listBuffer.push(ulItem[1]);
                } else {
                    const inline = parseInline(line);

                    if (listBuffer.length > 0) {
                        output.push({ type: 'ul', items: listBuffer });
                        listBuffer = [];
                    }
                    output.push({type: 'paragraph', children: inline, justify: alignText ? alignText[1] : "left"});
                }
            }

            if (listBuffer.length > 0) {
                output.push({ type: 'ul', items: listBuffer });
                listBuffer = [];
            }

            return output;
        }

        /**
         * @param {Array<{type: string, value: string}>} parsedText 
         */
        const populateTree = (parsedText) => {
            const output = []

            for (let token of parsedText) {
                const stack = []
                const parsedLine = [];

                const append = node => {
                    const target = stack.length ? stack[stack.length - 1].children : parsedLine;
                    target.push(node);
                };

                if (token.type === 'heading') {
                    output.push({type: 'heading', level: token.level, content: token.content})
                } else if (token.type === 'ul') {
                    output.push({ 
                        type: "ul", 
                        items: token.items.map(itemText => {
                            const inline = parseInline(itemText);
                            const children = populateTree([{ type: 'paragraph', children: inline }])[0].children;
                            return { type: 'li', children };
                        })
                    });
                } else if (token.type === 'paragraph') {
                    

                    for (let inline of token.children) {
                        if (inline.type === '**') {
                            if (stack.length && stack[stack.length - 1].type === 'bold') {
                                const node = stack.pop();
                                append(node);
                            } else {
                                stack.push({type: "bold", children: []});
                            }
                        } else if (inline.type === '_') {
                            if (stack.length && stack[stack.length - 1].type === 'italic') {
                                const node = stack.pop();
                                append(node);
                            } else {
                                stack.push({type: "italic", children: []});
                            }
                        } else if (inline.type === '__') {
                            if (stack.length && stack[stack.length - 1].type === 'underlined') {
                                const node = stack.pop();
                                append(node);
                            } else {
                                stack.push({type: "underlined", children: []});
                            }
                        } else if (inline.type === 'inlineCode') {
                            append({type: "inlineCode", value: inline.value})
                        } else if (inline.type === 'blockCode') {
                            append({type: "blockCode", value: inline.value})
                        } else if (inline.type === 'hyperlink') {
                            append({type: inline.type, href: inline.href, text: inline.text})
                        } else if (inline.type === 'image') {
                            append({type: inline.type, alt: inline.alt, src: inline.src, width: inline.width})
                        } else if (inline.type === 'coloredText') {
                            append({ type: "coloredText", fgcolor: inline.fgcolor, children: populateTree([{ type: 'paragraph', children: inline.value }])[0].children });
                        } else {
                            append({type: "text", value: inline.value});
                        }
                    }

                    while (stack.length) append(stack.pop());
                    output.push({type: "paragraph", children: parsedLine, justify: token.justify});
                }
            }
            
            return output;
        }

        const formatText = (parsed) => 
            parsed.map(node => {
                if (node.type === 'text') return node.value;
                if (node.type === 'coloredText') return `<a style="color:${node.fgcolor};">${formatText(node.children)}</a>`;
                if (node.type === 'bold') return `<strong>${formatText(node.children)}</strong>`
                if (node.type === 'italic') return `<em>${formatText(node.children)}</em>`
                if (node.type === 'underlined') return `<u>${formatText(node.children)}</u>`
                if (node.type === 'heading') return `<h${node.level}>${node.content}</h${node.level}>`
                if (node.type === 'paragraph') return `<p style="text-align:${node.justify};">${formatText(node.children)}</p>`
                if (node.type === 'hyperlink') return `<a href="${node.href}" target="_blank">${node.text}</a>`
                if (node.type === 'image') return `<img src="${node.src}" alt="${node.alt}" width="${node.width}"/><br><span id="img-${node.alt}-caption"><small><b>Caption</b>: ${node.alt[0].toUpperCase() + node.alt.slice(1)}</small></span>`
                if (node.type === 'inlineCode') return `<code style="background-color: lightgray; padding: 2px 5px; border-radius: 3px; font-family: monospace;">${node.value}</code>`
                if (node.type === 'blockCode') return `<pre style="background-color: lightgray; padding: 5px; border-radius: 3px; font-family: monospace;">${node.value}</pre>`
                if (node.type === 'ul') return `<ul>${node.items.map(li => `<li>${formatText(li.children)}</li>`).join('')}</ul>`;
            }).join('')
        init();
    }, [showPreview]);
    

    return (
        <Container valign={true}>
            <span id="audit-data"></span>
            <div id={editorId} className={className} style={textareaTagStyle} contentEditable="plaintext-only" ref={ref}>

            </div>
            {showPreview && (
                <>
                    <h3>Preview</h3>
                    <div id={previewId} className="preview" style={previewTagStyle}></div>
                </>
            )}
        </Container>
        
    )
}
