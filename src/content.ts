import { ITAD_API_KEY } from "./config";
import GameInfo from "./types/GamePriceOverview";
import itadContainer from "./components/itadContainer";
import itadItemInfo from "./components/itadItemInfo";
import {
  debounce,
  keepInViewPort,
  getCoords,
  appendAfterFirstText,
} from "./utils";
import itadInlineIcon from "./components/itadInlineIcon";
let itad_request_timer: NodeJS.Timeout;
let itad_display_timer: NodeJS.Timeout;
const itad_included = true;
let itad_info_container: HTMLDivElement;
let itad_info_status: HTMLDivElement;

const blacklist = [
  "isthereanydeal.com",
  "chat.openai.com",
  "store.steampowered.com/account/licenses/", // issue #1
];

for (const blacklisted of blacklist) {
  if (location.href.indexOf(blacklisted) !== -1) {
    // stop script from running
    throw new Error("ITAD Everywhere disabled on " + blacklisted);
  }
}

function handleLinks() {
  const external_links: NodeListOf<HTMLAnchorElement> =
    document.querySelectorAll(
      'a[href*="//store.steampowered.com/"]:not([data-itad-handled="1"])'
    );
  for (let i = 0; i < external_links.length; i++) {
    let appIDs = external_links[i].href.match(
      /\/\/store.steampowered.com\/(app|apps|sub|bundle)\/([0-9]+)/
    );

    if (appIDs && appIDs?.length >= 3) {
      const elementToAppend = itadInlineIcon(appIDs);
      appendAfterFirstText(external_links[i], elementToAppend);

      elementToAppend.addEventListener("mouseenter", OnEnterExtraElem, {
        passive: true,
      });
      elementToAppend.addEventListener("mouseleave", OnLeaveExtraElem, {
        passive: true,
      });

      external_links[i].dataset.itadHandled = "1";
    }
  }

  if (itad_included && !itad_info_container) {
    const { container, status } = itadContainer();

    itad_info_container = container;
    itad_info_status = status;

    document.body.appendChild(itad_info_container);

    itad_info_container.addEventListener("mouseenter", OnEnterContainer, {
      passive: true,
    });
    itad_info_container.addEventListener("mouseleave", OnLeaveContainer, {
      passive: true,
    });
  }
}

function getItemInfo(e: Event, currentInfoElemId: string) {
  clearTimeout(itad_request_timer);
  itad_request_timer = setTimeout(async function () {
    const target = e.target as HTMLSpanElement;

    if (!target.dataset.itadId) return;

    const feedURL =
      "https://api.isthereanydeal.com/v01/game/overview/?key=" +
      ITAD_API_KEY +
      "&shop=steam&ids=" +
      encodeURIComponent(target.dataset.itadId);
    try {
      const response = await fetch(feedURL);
      if (response.ok) {
        const result = (await response.json()) as GameInfo;
        buildItemInfo(result, e, currentInfoElemId);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, 350);
}

async function buildItemInfo(gameInfo: GameInfo, a: Event, b: string) {
  const itad_info_elem = itadItemInfo(gameInfo, a, b);

  if (!document.getElementById(b))
    document
      ?.getElementById("itad_info_container")
      ?.appendChild(itad_info_elem);

  keepInViewPort(itad_info_container);
  itad_info_status.innerHTML = "";
}

function OnEnterExtraElem(e: Event) {
  const target = e.target as HTMLElement;
  const itadId = target.dataset.itadId;
  const { left, top, right, bottom } = target.getBoundingClientRect();
  const popupOffset = 8; // moves the popup under the cursor
  itad_info_container.style.left =
    getCoords(target).left + (right - left) - popupOffset + "px";
  itad_info_container.style.top =
    getCoords(target).top + (bottom - top) - popupOffset + "px";

  clearTimeout(itad_display_timer);
  itad_info_container.classList.remove("itad_info_container_hidden");

  if (!itadId) return;

  const currentInfoElemId = "itad_info_elem_" + itadId.replace("/", "-");

  const divsToHide = document.getElementsByClassName(
    "itad_info_elem"
  ) as HTMLCollectionOf<HTMLElement>;
  for (const div of divsToHide) {
    if (div.id !== currentInfoElemId) {
      div.style.display = "none";
    }
  }

  const currentInfoElem = document.getElementById(currentInfoElemId);

  if (currentInfoElem) {
    itad_info_status.innerHTML = "";
    currentInfoElem.style.display = "flex";
  } else {
    itad_info_status.innerHTML = "Loading...";
    getItemInfo(e, currentInfoElemId);
  }

  keepInViewPort(itad_info_container);
}

function OnLeaveExtraElem(e: Event) {
  if (itad_info_container.classList.contains("itad_info_container_hidden"))
    clearTimeout(itad_request_timer);
  itad_display_timer = setTimeout(function () {
    itad_info_container.classList.add("itad_info_container_hidden");
  }, 200);
}

function OnEnterContainer() {
  clearTimeout(itad_display_timer);
  itad_info_container.classList.remove("itad_info_container_hidden");
}

function OnLeaveContainer() {
  itad_display_timer = setTimeout(function () {
    itad_info_container.classList.add("itad_info_container_hidden");
  }, 200);
}

const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      debounce(handleLinks, 500);
    }
  }
});

observer.observe(document, { childList: true, subtree: true });
handleLinks();