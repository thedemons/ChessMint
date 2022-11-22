const DefaultExtensionOptions2: ExtensionOptions = {
    depth: 15,
    threads: 2,
    show_hints: true,
    move_analysis: true,
    depth_bar: true,
    evaluation_bar: true,
    auto_move: false,
}


function injectScript(file: string)
{
    let s = document.createElement("script");

    s.src = chrome.runtime.getURL(file);
    (document.head || document.documentElement).appendChild(s);
    s.onload = function ()
    {
        s.remove();
    };
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse)
    {
        // pass the event to injected script
        window.dispatchEvent(new CustomEvent("ChessMintUpdateOptions", { detail: request.data }));
    }
);

window.addEventListener("ChessMintGetOptions", function (evt)
{
    chrome.storage.sync.get(DefaultExtensionOptions2, function (opts)
    {
        let request = (evt as any).detail;
        let response = { requestId: request.id, data: opts };
        window.dispatchEvent(new CustomEvent("ChessMintSendOptions", { detail: response }));
    });
});

injectScript("js/chessmint.js");