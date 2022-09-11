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
searchParams.set("page", 1);

const userProfiles = new Map();
const postHistory = [];
let postIndex = 0;

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

async function getPosts(limit) {
    const headers = new Headers();
    headers.append("User-Agent", "arlojay/1.0");
    searchParams.set("limit", limit);

    const req = await fetch(WEBSITE_URL + "/posts.json?"+searchParams, {
        method: "GET", headers
    })
    const res = await req.json();

    return res.posts;
}

async function updateCache(postCount = 4) {
    if(postIndex < postHistory.length-5) return;

    const posts = await getPosts(postCount);
    const promises = []; // updateCache() will resolve when all promises in this array are resolved

    // Loop through all newly fetched posts
    for(let i in posts) {
        const post = posts[i];

        //Add loaded image to history
        promises.push(new Promise((res, rej) => {
            setTimeout(() => {
                // Cache loaded post picture
                post.loadedImage = new Image();
                post.loadedImage.src = post.file.url;

                post.loadedImage.onerror = e => {
                    console.error("An error occured whilst fetching post image "+post.id+":\n", e);
                    res();
                }
                post.loadedImage.onload = _ => {

                    // Add user profile to cache
                    postHistory.push(post);
                    res();
                }
            }, i * 600); // Wait 600ms to prevent rate limiting
        }));

        // Cache user profile
        if(userProfiles.get(post.uploader_id) == null) {

            promises.push(new Promise((res, rej) => {
                setTimeout(() => {

                    // Add user profile to cache after waiting
                    getUserProfile(post.uploader_id).then(profile => {

                        // Cache loaded profile picture 
                        profile.loadedIcon = new Image();
                        profile.loadedIcon.src = profile.icon.preview.url;

                        profile.loadedIcon.onerror = e => {
                            console.error("An error occured whilst fetching user "+post.uploader_id+"'s profile picture:\n", e);
                            res();
                        }
                        profile.loadedIcon.onload = _ => {

                            // Add user profile to cache
                            userProfiles.set(post.uploader_id, profile);
                            res();
                        }
                    })
                }, i * 1200); // Wait 1200ms to prevent rate limiting
            }));
        }
    }

    // Remove old posts if there are too many
    if(postHistory.length > 128) {
        const deletedPosts = postHistory.splice(0, 64);
        postIndex -= 64;

        // Remove unlinked post authors from the cache to save memory
        for(let deletedPost of deletedPosts) {
            userProfiles.entries().forEach(id => {
                if(deletedPost.uploader_id == id)
                    userProfiles.delete(id);
            })
        }
    }

    // Wait for all profile caching to resolve
    for await(let prom of promises) await prom;
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
                preview: { url: "public/no-profile.png" },
                sample: { url: "public/no-profile.png" },
                file: { url: "public/no-profile.png" }
            }
        }
    }
}

function resizeImage(image) {
    if(image == null) return;

    const box = document.querySelector("#images").getBoundingClientRect();
    const width = box.width;
    const height = box.height * 0.9;

    image.style.removeProperty("height");
    image.style.width = width + "px";

    if (image.height * (width / image.width) > height) {
        image.style.height = height + "px";
        image.style.removeProperty("width");
    }
}

async function next() {
    const post = postHistory[postIndex++];
    console.log(post);
    load(post);

    updateCache();
}
async function prev() {
    postIndex--;
    if(postIndex < 0) postIndex = 0;

    const post = postHistory[postIndex];
    console.log(post);
    load(post);

    updateCache();
}

function load(post) {

    // Move images along
    document.querySelector("#previous-image")?.remove();
    document.querySelector("#current-image")?.remove();
    document.querySelector("#next-image")?.remove();

    const prevImg = postHistory[postIndex-1]?.loadedImage;
    const currImg = postHistory[ postIndex ]?.loadedImage;
    const nextImg = postHistory[postIndex+1]?.loadedImage;

    if(prevImg) document.querySelector("#images").appendChild(prevImg);
    if(currImg) document.querySelector("#images").appendChild(currImg);
    if(nextImg) document.querySelector("#images").appendChild(nextImg);
    
    prevImg?.setAttribute("id", "previous-image");
    currImg?.setAttribute("id", "current-image");
    nextImg?.setAttribute("id", "next-image");

    if(prevImg) resizeImage(prevImg);
    if(currImg) resizeImage(currImg);
    if(nextImg) resizeImage(nextImg);

    blacklistPage.hidden = true;

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


    popupText.innerText = post.description;
    tagsList.innerText = post.tags.general;
    likes.innerText = post.score.total;
    comments.innerText = post.comment_count;
    download.addEventListener("click", e => window.open(post.file.url));


    const profile = userProfiles.get(post.uploader_id);
    document.querySelector("#author img").src = profile?.icon.preview.url ?? "public/no-profile.png";
    document.querySelector("#author-name").innerText = profile?.profile.name ?? "Anonymous";
}

updateCache(2).then(next);

window.addEventListener("resize", e => {
    resizeImage(document.querySelector("#previous-image"))
    resizeImage(document.querySelector("#current-image"))
    resizeImage(document.querySelector("#next-image"))
});


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