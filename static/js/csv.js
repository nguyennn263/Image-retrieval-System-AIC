function startBlobDownload(MIME, file, filename) {
    const data = file;
    const myBlob = new Blob([data], {type: MIME})
    blobURL = URL.createObjectURL(myBlob);

    const a = document.createElement('a');
    a.setAttribute('href', blobURL);
    a.setAttribute('download', filename);

    a.style.display = 'none';
    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(blobURL);
}

