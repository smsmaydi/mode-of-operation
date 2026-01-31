export async function fileToPixelBytes(
  file,
  { width = 512, height = 512 } = {}
) {
  const url = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;

    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);

    // normalize et: her görsel 512×512 olur
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    return new Uint8Array(imageData.data); // RGBA bytes
  } finally {
    URL.revokeObjectURL(url);
  }
}
