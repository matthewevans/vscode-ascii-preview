# ascii-preview README

Derived from the VSCode Image Preview extension, this takes it a step further and displays any image opened as ASCII text. Utilizes the [asciify-image](https://github.com/ajay-gandhi/asciify-image) npm library.

## Why Would I use this?

This was designed not for _just_ fluff, but fluff with style. This is targeted at the person who wants their README to have a vintage logo - a throwback to the logos of the 90's. This isn't as amazing as those precise and meticulously hand-crafted works of art, but it might let you fake it 'til you make it.

Further development efforts could involve:

* Embedding information. User input fields could be inserted in a formatted fashion in the middle of the logo to further enhance the output.
* Custom text-rendering based on input.

## Features

Display selected image (png, gif, jpg) as ASCII text. Also includes:

* Toggle between the original image and generated ASCII to compare.
* Copy generated ASCII to clipboard.
* Configurable parameters in extension settings.

## Requirements

npm

## Extension Settings

This extension contributes the following settings:

* `asciiPreview.fit`: Type of fit to use when generating ASCII. Options are 'box', 'original', 'width', 'height'. 'original' will ignore dimension parameters. Default is 'width' to keep it small.
* `asciiPreview.width`: Horizontal dimension. 'box' and 'width' respect this value.
* `asciiPreview.height`: Vertical dimension. 'box' and 'height' respect this value.

## Sample

![Sample Screenshot](screencap.png?raw=true "Screenshot")

## Requirements

~~~
git clone https://github.com/matthewevans/vscode-ascii-preview.git
cd vscode-ascii-preview
npm install
~~~

* Open folder in VSCode
* Press F5 to try it out. (Ignore warning from asciify-image types file)

## Other Extensions

* [vscode-textinfo](https://github.com/matthewevans/vscode-textinfo) - offers estimated remaining reading time as well as source code comment annotation markup that calculates estimated readability grade level.


