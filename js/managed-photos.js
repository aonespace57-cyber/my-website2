(() => {
  const siteRoot = new URL("../", document.currentScript.src);

  function photoUrl(value) {
    if (typeof value !== "string" || !/^\/?images\//.test(value)) {
      throw new Error("Photo must be stored in images/");
    }
    const url = new URL(value.replace(/^\//, ""), siteRoot);
    const imagesRoot = new URL("images/", siteRoot);
    if (url.origin !== imagesRoot.origin || !url.pathname.startsWith(imagesRoot.pathname)) {
      throw new Error("Invalid photo path");
    }
    return url.href;
  }

  function validatePhoto(photo) {
    if (!photo || typeof photo.alt !== "string") {
      throw new Error("Missing photo description");
    }
    return {
      src: photoUrl(photo.image),
      alt: photo.alt,
      caption: typeof photo.caption === "string" ? photo.caption : "",
    };
  }

  async function readContent(name) {
    const response = await fetch(new URL(`content/${name}.json`, siteRoot), {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Photo list unavailable: ${response.status}`);
    return response.json();
  }

  async function updateGallery(gallery) {
    const data = await readContent(gallery.dataset.photos);
    // A saved empty list is intentional; malformed data keeps the HTML fallback.
    const list = data.photos == null ? [] : data.photos;
    if (!Array.isArray(list)) throw new Error("Invalid photo list");
    const photos = list.map(validatePhoto);
    const fragment = document.createDocumentFragment();

    for (const photo of photos) {
      const tile = document.createElement("div");
      tile.className = "color-tile image-tile";
      const image = document.createElement("img");
      image.src = photo.src;
      image.alt = photo.alt;
      tile.append(image);
      if (photo.caption) {
        const caption = document.createElement("span");
        caption.className = "model-caption";
        caption.textContent = photo.caption;
        tile.append(caption);
      }
      fragment.append(tile);
    }

    if (!photos.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "color-tile model-placeholder case-placeholder";
      placeholder.textContent = "사진 준비 중";
      fragment.append(placeholder);
    }

    gallery.replaceChildren(fragment);
    document.dispatchEvent(new Event("managedphotosupdated"));
  }

  async function updateFeatured() {
    const data = await readContent("featured");
    const updates = [...document.querySelectorAll("[data-featured]")].map((image) => ({
      image,
      photo: validatePhoto(data[image.dataset.featured]),
    }));
    for (const { image, photo } of updates) {
      image.src = photo.src;
      image.alt = photo.alt;
    }
  }

  window.loadManagedPhotos = async () => {
    // Opening index.html directly still shows the original static photos.
    if (siteRoot.protocol === "file:") return;
    const jobs = [...document.querySelectorAll("[data-photos]")].map(updateGallery);
    jobs.push(updateFeatured());
    const results = await Promise.allSettled(jobs);
    for (const result of results) {
      if (result.status === "rejected") console.warn("기존 사진을 표시합니다.", result.reason);
    }
  };
})();
