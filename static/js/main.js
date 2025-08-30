function add_paging() {
    console.log(data['num_page']);
    var url = new URL(window.location.href);
    var cur_index = parseInt(url.searchParams.get("index"));
    var imgpath = url.searchParams.get("imgpath");
    if (cur_index == 'undefined') {
        cur_index = 0;
    }
    var i = cur_index - 4;
    if (i > 0) {
        var iDiv = document.createElement('div');
        iDiv.className = 'page_num';
        iDiv.innerHTML = "...";
        document.getElementById("div_page").appendChild(iDiv);
    }
    for (i; ((i < data['num_page']) && (i < cur_index + 4)); i++) {
        if (i < 0) {
            i = 0;
        }
        var iDiv = document.createElement('div');
        iDiv.className = 'page_num';
        var iA = document.createElement('a');
        iA.href = "?index=" + i.toString() + "&imgpath=" + imgpath;
        iA.innerHTML = i.toString();
        if (i == cur_index) {
            iA.style.color = "green";
        }
        iDiv.appendChild(iA);
        document.getElementById("div_page").appendChild(iDiv);
    }
    if (i < data['num_page']) {
        var iDiv = document.createElement('div');
        iDiv.className = 'page_num';
        iDiv.innerHTML = "...";
        document.getElementById("div_page").appendChild(iDiv);
    }
    document.getElementById("div_total_page").innerHTML = "Total: " + data['num_page'].toString() + " page";
}

function add_img(div_id_image) {
    let div_img = document.getElementById("div_img");
    let pagefile_list = data['pagefile'];

    pagefile_list.forEach((item, index) => {
        console.log(item);
        $("#div_img").append(
            `<div class= "container_img_btn"  onmouseover="mouseOver(${index})" onmouseout="mouseOut(${index})">
                <button class="btn_knn" onClick="go_img_search(${item.id})">IR</button>
                <button class="btn_select" onClick="view_image('${item.imgpath}')">VW</button>
                <button class="btn_vid" onClick="view_video('${item.imgpath}')">VS</button>
                <span class="path">${item.imgpath.substring(item.imgpath.indexOf("/") + 1)}</span>
                <img class="hoverImg" id="img_${item.id}" onclick="toggleImage(${item.id})">
                </div>`
        );
        document.getElementById(`img_${item.id}`).src = item.imgpath;
    });

}


function view_image(imgpath) {
    window.open("/view?keyframe=" + imgpath);
}

async function view_video(imagePath) {
    // Tách tên folder từ đường dẫn ảnh
    const parts = imagePath.split('/');
    const folderName = parts[parts.length - 2]; // Lấy tên folder, ví dụ: L01_V001
    const imageName = parts[parts.length - 1].split('.')[0]; // Lấy tên ảnh, ví dụ: 0001

    // Tạo đường dẫn video tương ứng
    const videoFolderName = 'Videos_' + folderName.split('_')[0]; // Ví dụ: L01 -> Videos_L01
    const videoPath = `${videoFolderName}/${folderName}.mp4`;
    // console.log(videoPath, imageName)
    // Gửi yêu cầu tới Flask API để lấy thời gian từ CSV

    try {
        const response = await fetch(`/get_time?video=${folderName}&id=${imageName}&videoPath=${videoPath}`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const time = await response.text();
        console.log(folderName, videoPath, time)
        window.open(`/vid?folderName=${folderName}&videoPath=${videoPath}&time=${time}`);
        
    } catch (error) {
        console.error(error);
    }

}

function mouseOver(id) {
    btn_knn[id].style.display = "block";
    btn_select[id].style.display = "block"
    btn_vid[id].style.display = "block"
}
function mouseOut(id) {
    btn_knn[id].style.display = "none";
    btn_select[id].style.display = "none";
    btn_vid[id].style.display = "none";
}

function go_img_search(id) {
    window.open("/imgsearch?imgid=" + id);
}

function go_new_img_search(imgpath) {
    window.open("/newimgsearch?imgpath=" + imgpath);
}

function b64DecodeUnicode(str) {
    return decodeURIComponent(escape(atob(str)));
}

function on_load() {
    var url = new URL(window.location.href);
    console.log(data)
    if (localStorage.imgSrcList == undefined) {
        localStorage.imgSrcList = '';
    }
    if ("query" in data) {
        data["query"] = b64DecodeUnicode(data["query"]);
        document.getElementById("text_query").value = data["query"]
    }
    add_paging();
    add_img("div_img");
    loadSelectedImages();
}

function toggleImage(id) {
    const selectedImagesDiv = document.getElementById('selected_images');
    const imgElement = document.getElementById(`img_${id}`);
    const imgSrc = imgElement.src;

    if (imgElement.classList.contains('selected')) {
        imgElement.classList.remove('selected');
        removeImgSrcFromList(imgSrc);
        removeImageFromSelectedArea(imgSrc);
    } else {
        imgElement.classList.add('selected');
        addImgSrcToList(imgSrc);
        addImageToSelectedArea(imgSrc);
    }
    updateSelectedImagesDisplay();
}

function loadSelectedImages() {
    const imgSrcs = getImgSrcList();
    imgSrcs.forEach(imgSrc => {
        const query = `#controllers img[src='${"new" + imgSrc.split("new")[1]}']`;
        console.log()
        const imgElement = document.querySelector(query);
        if (imgElement) {
            imgElement.classList.add('selected');
        }
        addImageToSelectedArea(imgSrc);
    });
    updateSelectedImagesDisplay();
}

function createButton(text, onClick) {
    const button = document.createElement('button');
    button.innerHTML = text;
    button.onclick = onClick;
    return button;
}

function addImageToSelectedArea(imgSrc) {
    const selectedImagesDiv = document.getElementById('selected_images');
    const containerDiv = document.createElement('div');
    containerDiv.className = 'selected-image-container';

    const newImg = document.createElement('img');
    newImg.src = imgSrc;
    console.log(imgSrc);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'image-buttons';

    const moveUpBtn = createButton('↑', () => moveImage(imgSrc, 'up'));
    const moveDownBtn = createButton('↓', () => moveImage(imgSrc, 'down'));
    const removeBtn = createButton('×', () => removeImage(imgSrc));
    removeBtn.classList.add('remove');

    
    const info = document.createElement('div');
    info.innerText = imgSrc.split('keyframes/')[1];
    info.className = 'info';

    const controllers = document.createElement('div');
    controllers.className = 'image-controllers';
    const IRBtn = createButton('IR', () => go_new_img_search('new_keyframes/' + info.innerText));
    const VWBtn = createButton('VW', () => view_image('new_keyframes/' + info.innerText));
    controllers.appendChild(IRBtn);
    controllers.appendChild(VWBtn);

    buttonsDiv.appendChild(moveUpBtn);
    buttonsDiv.appendChild(moveDownBtn);
    buttonsDiv.appendChild(removeBtn);

    containerDiv.appendChild(newImg);
    containerDiv.appendChild(buttonsDiv);
    containerDiv.appendChild(info);
    containerDiv.appendChild(controllers)

    selectedImagesDiv.appendChild(containerDiv);
}


function removeImageFromSelectedArea(imgSrc) {
    const selectedImagesDiv = document.getElementById('selected_images');
    const imageContainers = selectedImagesDiv.querySelectorAll('.selected-image-container');
    imageContainers.forEach(container => {
        if (container.querySelector('img').src === imgSrc) {
            selectedImagesDiv.removeChild(container);
        }
    });
}

function moveImage(imgSrc, direction) {
    const imgSrcList = getImgSrcList();
    const index = imgSrcList.indexOf(imgSrc);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        [imgSrcList[index - 1], imgSrcList[index]] = [imgSrcList[index], imgSrcList[index - 1]];
    } else if (direction === 'down' && index < imgSrcList.length - 1) {
        [imgSrcList[index], imgSrcList[index + 1]] = [imgSrcList[index + 1], imgSrcList[index]];
    }

    localStorage.setItem('imgSrcList', JSON.stringify(imgSrcList));
    updateSelectedImagesDisplay();
}

function removeImage(imgSrc) {
    removeImgSrcFromList(imgSrc);
    removeImageFromSelectedArea(imgSrc);
    const imgElement = document.querySelector(`#controllers img[src='${imgSrc}']`);
    if (imgElement) {
        imgElement.classList.remove('selected');
    }
    updateSelectedImagesDisplay();
}


function updateSelectedImagesDisplay() {
    const selectedImagesDiv = document.getElementById('selected_images');
    selectedImagesDiv.innerHTML = '';
    const imgSrcList = getImgSrcList();
    imgSrcList.forEach(imgSrc => addImageToSelectedArea(imgSrc));
}

function delete_all() {
    if (!confirm("Are you sure YOU WANT TO DELETE ALL?")) return;
    const selectedImagesDiv = document.getElementById('selected_images');
    const imagesInControllers = document.querySelectorAll('#controllers img');

    // Clear local storage
    localStorage.removeItem('imgSrcList');

    // Remove all images from the selected images area
    selectedImagesDiv.innerHTML = '';

    // Unselect all images in controllers
    imagesInControllers.forEach(img => {
        img.classList.remove('selected');
    });
}

// Helper functions to manage the list of image sources in localStorage
function addImgSrcToList(imgSrc) {
    let imgSrcList = getImgSrcList();
    if (!imgSrcList.includes(imgSrc)) {
        imgSrcList.push(imgSrc);
        localStorage.setItem('imgSrcList', JSON.stringify(imgSrcList));
    }
}

function removeImgSrcFromList(imgSrc) {
    let imgSrcList = getImgSrcList();
    imgSrcList = imgSrcList.filter(src => src !== imgSrc);
    localStorage.setItem('imgSrcList', JSON.stringify(imgSrcList));
}

function getImgSrcList() {
    const storedList = localStorage.getItem('imgSrcList');
    return storedList ? JSON.parse(storedList) : [];
}


async function get_csv() {
    const filename = prompt('Enter file name:');
    if (!filename) return;

    const map = true;
    const srcList = getImgSrcList();

    try {
        const data = await Promise.all(srcList.map(async (src) => {
            const needed = src.split("keyframes/")[1].split('.')[0].split('/');
            if (map) {
                const keyframe = await fetchKeyframe(needed[0], needed[1]);
                if (!keyframe) {
                    console.error("Keyframe not found for:", needed[0], needed[1]);
                    // Optional: Handle the missing keyframe gracefully (e.g., use a default value)
                } else {
                    needed[1] = keyframe.toString();
                }
            }
            return needed;
        }));

        const csvFormat = data.map(row => row.join(",")).join("\n");
        startBlobDownload('text/csv', csvFormat, filename);
    } catch (error) {
        console.error("Error generating CSV:", error);
        // Handle errors gracefully (e.g., display a user-friendly message)
    }
}

async function fetchKeyframe(video, id) {
    try {
        const response = await fetch(`/map?video=${video}&id=${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        console.log(response);

        const data = await response.text();
        return data;
    } catch (error) {
        console.error(error);

        return null;
    }
}

function add_keyframe() {
    let new_img = "http://localhost:5001/" + prompt('Copy full filename from Preview and paste here');
    if (!new_img) return alert('Please enter the correct one!');
    let temp = JSON.parse(localStorage.imgSrcList);
    if (temp.indexOf(new_img) === -1) 
        temp.push(new_img);
    else alert("The keyframe is already selected!")
    localStorage.imgSrcList = JSON.stringify(temp);
    loadSelectedImages();
}