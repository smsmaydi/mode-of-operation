export async function fileToPixelBytes(
  file,
  { width = 256, height = 256 } = {}
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


    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    return new Uint8Array(imageData.data); // RGBA bytes
  } finally {
    URL.revokeObjectURL(url);
  }
}
