const WEBSITE_URL = "https://e621.net";
const blacklistPage = document.querySelector("#blacklist-warning");
const likes = document.querySelector("#likes .count");
const likesIcon = document.querySelector("#likes .far");
const comments = document.querySelector("#comments .count");
const commentsIcon = document.querySelector("#comments .fas");
const download = document.querySelector("#download .fas");
const infoIcon = document.querySelector("#info .fas");
const popup = document.querySelector('.popup');
const tagsList = document.queryCommandIndeterm('#tagsList')
const popupText = document.querySelector('#popupText');
const blacklistedTags = [
    "gore",
    "scat",
    "watersports",
    "young",
    "loli",
    "shota",
    "feces",
    "fart",
    "peeing",
]

const searchParams = new URLSearchParams();
searchParams.set("tags", "score:10..50 -animated -comic order:random");
searchParams.set("limit", 1);
searchParams.set("page", 1);

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

async function getPost() {
    const headers = new Headers();
    headers.append("User-Agent", "arlojay/1.0");

    const req = await fetch(WEBSITE_URL + "/posts.json?"+searchParams, {
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
            icon: profilePicturePostResponse.post
        }
    } else {
        return {
            profile: profileResponse,
            icon: {
                preview: { url: "public/e621-no-profile.png" },
                sample: { url: "public/e621-no-profile.png" },
                file: { url: "public/e621-no-profile.png" }
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
    const post = await getPost();
    const imageElem = document.querySelector("#image").querySelector("img");
    imageElem.src = post.file.url;

    const blacklist = [];
    for(let k of Object.keys(post.tags)) {
        post.tags[k].filter(d => 
            blacklistedTags.includes(d)
        ).forEach(b =>
            blacklist.push(b)
        );
    }

    if(blacklist.length > 0) {
        blacklistPage.hidden = false;
        const list = blacklistPage.querySelector("ul");

        for(let child of list.children) {
            child.remove();
        }

        for(let tag of blacklist) {
            const li = document.createElement("li");
            li.innerText = tag[0].toUpperCase() + tag.slice(1);
            list.appendChild(li);
        }
    }

    resizeImage()

    popupText.innerText = post.description;
    tagsList.innerText = post.tags.general;
    likes.innerText = post.score.total;
    comments.innerText = post.comment_count;
    download.addEventListener("click", e => window.open(post.file.url));


    const profile = await getUserProfile(post.uploader_id);
    console.log(profile);

    document.querySelector("#author img").src = profile.icon.preview.url;
    document.querySelector("#author-name").innerText = profile.profile.name;
}

load().catch(e => {
    document.body.innerText = e.stack ?? e;
})

window.addEventListener("resize", resizeImage);


blacklistPage.querySelector("button").addEventListener("click", e => {
    blacklistPage.hidden = true;
})

let i = 0;

 likesIcon.addEventListener("mousedown", e => {
    i++;
    if (i % 2 != 0) {
        likesIcon.style.color = "#f88";
    } else {
        likesIcon.style.color = "#fff";
    }
})

infoIcon.addEventListener("click", e => {
   popup.classList.toggle("visible")
})