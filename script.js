
const uploadForm = document.getElementById("uploadForm");
const pdfFile = document.getElementById("pdfFile");
const fileName = document.getElementById("fileName");
const uploadButton = document.getElementById("uploadButton");
const uploadStatus = document.getElementById("uploadStatus");
const documentInfo = document.getElementById("documentInfo");
const documentList = document.getElementById("documentList");

const chatForm = document.getElementById("chatForm");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");
const sourceArea = document.getElementById("sourceArea");
const clearChatButton = document.getElementById("clearChat");

function showStatus(message, type = "") {
    uploadStatus.textContent = message;
    uploadStatus.className = type;
}

function addMessage(sender, text) {
    const message = document.createElement("div");

    message.className = "message " +
        (sender === "user" ? "user-message" : "bot-message");

    message.textContent = text;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}

function resetChat(message) {
    chatMessages.innerHTML = "";
    sourceArea.innerHTML = "";
    addMessage("bot", message);
}

pdfFile.addEventListener("change", function () {
    const file = pdfFile.files[0];

    fileName.textContent = file
        ? file.name
        : "Choose your PDF";
});

async function loadDocuments() {
    try {
        const response = await fetch("/documents");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Cannot load documents.");
        }

        documentList.innerHTML = "";

        if (!data.documents || data.documents.length === 0) {
            const empty = document.createElement("p");
            empty.className = "subtitle";
            empty.textContent = "No documents uploaded yet.";
            documentList.appendChild(empty);
            return;
        }

        data.documents.forEach(function (doc) {
            const item = document.createElement("div");
            item.className = "document-item";

            const details = document.createElement("div");

            const name = document.createElement("div");
            name.className = "document-name";
            name.textContent = "📄 " + doc.filename;

            const meta = document.createElement("div");
            meta.className = "document-meta";
            meta.textContent =
                doc.pages + " pages · " +
                doc.chunks + " chunks";

            details.appendChild(name);
            details.appendChild(meta);

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-button";
            removeButton.textContent = "Remove";

            removeButton.addEventListener("click", function () {
                removeDocument(doc.id);
            });

            item.appendChild(details);
            item.appendChild(removeButton);
            documentList.appendChild(item);
        });

    } catch (error) {
        showStatus(error.message, "error");
    }
}

uploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const file = pdfFile.files[0];

    if (!file) {
        showStatus("Please select a PDF file.", "error");
        return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        showStatus("Only PDF files are allowed.", "error");
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showStatus("Maximum PDF size is 10 MB.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    uploadButton.disabled = true;
    uploadButton.textContent = "Processing PDF...";
    showStatus("Processing your document...");

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Upload failed.");
        }

        showStatus(data.message, "success");

        documentInfo.textContent =
            "File: " + data.filename + "\n" +
            "Pages: " + data.pages + "\n" +
            "Characters: " + data.characters + "\n" +
            "Chunks: " + data.chunks + "\n" +
            "Embedding dimension: " + data.embedding_dimension;

        pdfFile.value = "";
        fileName.textContent = "Choose your PDF";

        await loadDocuments();

        resetChat(
            "PDF uploaded successfully! " +
            "Ask me questions or request a summary."
        );

    } catch (error) {
        showStatus(error.message, "error");
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload & Process PDF";
    }
});

async function removeDocument(documentId) {
    try {
        const response = await fetch(
            "/documents/" + encodeURIComponent(documentId),
            { method: "DELETE" }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Removal failed.");
        }

        showStatus("Document removed successfully.", "success");
        documentInfo.textContent = "";

        await loadDocuments();

        resetChat(
            "Document removed. Your other PDFs are still available."
        );

    } catch (error) {
        showStatus(error.message, "error");
    }
}

function displaySources(results) {
    sourceArea.innerHTML = "";

    if (!Array.isArray(results) || results.length === 0) {
        return;
    }

    const heading = document.createElement("h4");
    heading.textContent = "Relevant PDF passages";
    sourceArea.appendChild(heading);

    results.forEach(function (result, index) {
        const item = document.createElement("div");
        item.className = "source-item";

        item.textContent =
            "Source " + (index + 1) +
            " — " + result.filename + "\n" +
            result.text;

        sourceArea.appendChild(item);
    });
}

chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const question = questionInput.value.trim();

    if (!question) {
        return;
    }

    addMessage("user", question);
    questionInput.value = "";

    sendButton.disabled = true;
    sendButton.textContent = "Thinking...";

    const loadingMessage = addMessage("bot", "Generating answer...");

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ question: question })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Chat request failed.");
        }

        loadingMessage.textContent =
            data.answer || "No answer was generated.";

        displaySources(data.results);

    } catch (error) {
        loadingMessage.textContent = error.message;
        sourceArea.innerHTML = "";
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Send ➤";
        questionInput.focus();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

clearChatButton.addEventListener("click", async function () {
    try {
        const response = await fetch("/clear_chat", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Could not clear chat.");
        }

        resetChat(
            "Chat cleared! Your uploaded PDFs are still available."
        );

    } catch (error) {
        alert(error.message);
    }
});

loadDocuments();
