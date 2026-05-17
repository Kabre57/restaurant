import zipfile
import xml.etree.ElementTree as ET
import sys

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as docx:
            tree = ET.fromstring(docx.read('word/document.xml'))
            paragraphs = []
            for paragraph in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                texts = [node.text
                         for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                         if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            return '\n'.join(paragraphs)
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(get_docx_text(sys.argv[1]))
    else:
        print("Provide file path")
