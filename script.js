const WEBSITE_URL = "https://e621.net";
const blacklistPage = document.querySelector("#blacklist-warning button");

function cloneTemplate(id) {
    const template = document.querySelector("#template_" + id);
    const clone = template.content.cloneNode(true);

    return clone;
}

function addPost(post, onLoaded) {
    const parentElem = cloneTemplate("imagepreview");
    const title = parentElem.querySelector(".title");
    const img = parentElem.querySelector("img");

    img.src = post.sample.url;
    title.innerText = post.description;

    img.onload = _ => onLoaded?.(post);

    return parentElem;
}

async function getPost(index) {
    const headers = new Headers();
    headers.append("User-Agent", "arlojay/1.0");

    const req = await fetch(WEBSITE_URL + "/posts.json?limit=1&page=" + index, {
        method: "GET", headers
    })
    const res = await req.json();

    return res.posts[0];
}

async function getUserProfile(uid) {
    const profileRequest = await fetch(WEBSITE_URL + "/users/" + uid + ".json");
    const profileResponse = await profileRequest.json();

    if (profileResponse.avatar_id != null) {
        const profilePicturePostRequest = await fetch(WEBSITE_URL + "/posts/" + profileResponse.avatar_id + ".json");
        const profilePicturePostResponse = await profilePicturePostRequest.json();

        return {
            profile: profileResponse,
            icon: profilePicturePostResponse
        }
    } else {
        return {
            profile: profileResponse,
            icon: {
                preview: { url: "e621-no-profile.png" },
                sample: { url: "e621-no-profile.png" },
                file: { url: "e621-no-profile.png" }
            }
        }
    }
}

function resizeImage() {
    const imageElem = document.querySelector("#image");
    const imageImg = imageElem.querySelector("img");
    const box = imageElem.getBoundingClientRect();

    imageImg.style.height = null;
    imageImg.style.width = box.width + "px";

    if (imageImg.height * (imageImg.width / box.width) > box.height) {
        imageImg.style.height = box.height + "px";
        imageImg.style.width = null;
    }
}

async function load() {
    const post = await getPost(0);
    const imageElem = document.querySelector("#image").querySelector("img");
    imageElem.src = post.file.url;

    resizeImage()

    const profile = await getUserProfile(post.uploader_id);
    console.log(profile);
}

load().catch(e => {
    document.body.innerText = e.stack ?? e;
})

window.addEventListener("resize", resizeImage);


blacklistPage.addEventListener("click", e => {
    
})