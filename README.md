# DeSatellite

A [PixInsight](https://pixinsight.com/) script that removes satellite trails from astronomical images by painting them black or replacing them with pixels from a reference frame.

---

## Features

- **Draw satellite trails** by clicking anchor points on the preview image
- **Two removal modes**
  - Fill with black (no reference required)
  - Replace with pixels from a reference frame (LinearFit-matched for seamless blending)
- **Curve mode** — place 3 or more anchor points to trace curved trails
- **Edit mode** — move existing anchors after placement
- **Undo** — remove the last-placed anchor
- **AutoStretch preview** — live histogram-equalized preview for easier trail identification
- **Reference preview** — display the reference image in the preview area to verify alignment
- **Batch processing** — queue multiple files, save results to an output folder with a custom suffix
  - Register files and set the output folder in any order; processing starts automatically when both are ready
  - Save & Next / Skip (Copy) / Skip (No Copy) / Cancel batch
- **Language support** — English and Japanese UI

---

## Requirements

- PixInsight 1.8.9 or later

---

## Installation

Option 1: Via PixInsight Repository (Recommended)

1. In PixInsight, open **Resources > Updates > Manage Repositories**
2. Click **Add** and enter:
**https://raw.githubusercontent.com/mirfak-BK/DeSatellite/master/**
3. Go to **Resources > Updates > Check for Updates**
4. Select **DeSatellite** and click **Apply**

Option 2: Manual installation

1. Download this script
2. In PixInsight, open **Script → Feature Scripts...**
3. Click **Add** and navigate to the folder containing the script
4. Click **Done** — DeSatellite will appear under **Script → Utilities → DeSatellite**

Alternatively, run it directly via **Script → Run Script File...**

---

## Usage

### Single image

1. Select the target image from the dropdown list, or click **Open File...** to open a file
2. (Optional) Select a reference frame from the Reference dropdown
3. Click on the preview to place anchor points along the satellite trail
   - The first anchor is placed automatically — just click to start
   - In default (2-point) mode, the trail is finalized after the second click
   - Enable **Multi Point Mode** to draw curved trails with 3 or more anchors
4. Adjust **Line Width** to match the trail width
5. Click **Apply** to remove the trail
   - The preview updates to show the processed image
   - Repeat for additional trails on the same image
6. Save the result using PixInsight's normal save workflow

### Batch processing

1. Click **Add files to queue...** and select multiple image files
2. Click **Output folder...** and select the destination folder
   - Processing starts automatically once both are set (order does not matter)
3. For each file:
   - Draw trail(s) and click **Apply**, or
   - Click **Save & Next** to apply and advance, or
   - Click **Skip (Copy)** to copy the file without processing, or
   - Click **Skip (No Copy)** to skip without saving
4. Click **Cancel batch** to stop at any time
5. When all files are processed, a completion message appears and the queue is cleared

---

## Controls

| Control | Description |
|---|---|
| Target dropdown | Select or open the image to process |
| Reference dropdown | Select a reference frame for pixel replacement |
| Preview checkbox | Overlay the drawn trail on the preview |
| Reference checkbox | Display the reference image in the preview area |
| Multi Point Mode | Enable curve mode (3+ anchor points) |
| Line Width | Width of the removal mask in pixels |
| Edit (⊕) button | Toggle anchor-edit mode — move existing anchors without adding new ones (green = off, red = on) |
| Undo button | Remove the last anchor point |
| Apply button | Apply the removal to the current image |

---

## Tips

- Open the reference image before the target image, then select it from the Reference dropdown
- For curved trails, enable **Multi Point Mode** before placing anchors
- The **Reference** checkbox is useful for verifying that the reference and target are aligned before applying
- In batch mode, the output filename is `<original_name><suffix>` (default suffix: `_ds`)

---

## Acknowledgements

- **Hartmut V. Bornemann** for SKill.js
- **Andres del Pozo** for PreviewControl.js
- **stackoverflow** for the curve interpolation function
- **Herbert Walter** and **Gerald Wechselberger** for testing and tips

---

## License

Copyright © 2026 Kidani Bunkei  
Contact: peseta_aircrew.6d@icloud.com
