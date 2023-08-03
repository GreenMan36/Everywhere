import InlineIcon from "../components/InlineIcon.svelte";
import Modal from "../components/Modal.svelte";
import SteamId from "../Data/SteamId";
import {getAppendableNode} from "../utils";

export function handleSteamLinks(modal: Modal, root: ParentNode | undefined = undefined) {
    root = root ?? document;

    const links: NodeListOf<HTMLAnchorElement>
        = root.querySelectorAll("a[href*='//store.steampowered.com/']:not([data-itad-handled='1'])");
    const regex = /\/\/store.steampowered.com\/((?:app|apps|sub|bundle)\/[0-9]+)/;

    for (const a of links) {
        const m = a.href.match(regex);

        if (m) {
            try {
                const steamId = new SteamId(m[1]);
                const node = getAppendableNode(a);

                const target = node?.parentNode ?? a;
                const anchor = node?.nextSibling ?? undefined

                new InlineIcon({
                    target,
                    anchor,
                    props: {
                        modal,
                        id: steamId
                    }
                });
            } catch (e) {
                console.log("Didn't find node to append to", a.href);
            }

            a.dataset.itadHandled = "1";
        }
    }
}