document.addEventListener("DOMContentLoaded", function () {
  // Use buttons to toggle between views
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"));
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"));
  document
    .querySelector("#archive")
    .addEventListener("click", () => load_mailbox("archive"));
  document
    .querySelector("#compose")
    .addEventListener("click", () => compose_email());

  // By default, load the inbox
  load_mailbox("inbox");
});

function set_menuItem_active(mailbox) {
  const menuItems = document.querySelectorAll(".menu-items button");
  menuItems.forEach((item) => {
    item.classList.remove("active-menu-btn");
  });
  document.getElementById(mailbox).classList.add("active-menu-btn");
}

function format_timestamp(timestamp) {
  //format timestamp to a shorter one
  const date = new Date(timestamp);

  const today = new Date();
  let new_timestamp;
  if (date.toDateString() === today.toDateString()) {
    new_timestamp = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    new_timestamp = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }
  return new_timestamp;
}

// compose email
function compose_email(emailId = null) {
  set_menuItem_active("compose");

  // Show compose view and hide other views
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";
  document.querySelector("#email-view").style.display = "none";

  // Prefill the form to compose to reply email
  if (emailId != null) {
    fetch(`/emails/${emailId}`)
      .then((response) => response.json())
      .then((emaildetails) => {
        var subject = emaildetails.subject;
        var body = emaildetails.body.replace(/^/gm, "\t");

        document.querySelector(".page-title").innerHTML = "Reply Email";

        //if sender is current user, send to recipient (in case of replying to sent emails)
        if (emaildetails.sender === emaildetails.current_user) {
          document.querySelector("#compose-recipients").value =
          emaildetails.recipients[0];
        }else{
          document.querySelector("#compose-recipients").value =
          emaildetails.sender;
        }
        
        if (subject.startsWith("Re : ")) {
          document.querySelector("#compose-subject").value = subject;
        } else {
          document.querySelector("#compose-subject").value =
            "Re : " + emaildetails.subject;
        }
        document.querySelector(
          "#compose-body"
        ).value = `\n\n\nOn ${emaildetails.timestamp} ${emaildetails.sender} wrote :\n\n${body}\n`;

        document.querySelector("#compose-body").focus();
        document.querySelector("#compose-body").selectionStart = 0;
        document.querySelector("#compose-body").selectionEnd = 0;
      });
  } else {
    document.querySelector(".page-title").innerHTML = "Compose a new Email";
    // Clear out composition fields
    document.querySelector("#compose-recipients").value = "";
    document.querySelector("#compose-subject").value = "";
    document.querySelector("#compose-body").value = "";
  }

  document.querySelector("#submit-btn").onclick = function () {
    // check if the body is not empty
    if (document.querySelector("#compose-body").value != "") {
      fetch("/emails", {
        method: "POST",
        body: JSON.stringify({
          recipients: document.querySelector("#compose-recipients").value,
          subject: document.querySelector("#compose-subject").value,
          body: document.querySelector("#compose-body").value,
        }),
      })
        .then((response) => response.json())
        .then((result) => {
          // Print result
          console.log(result);
          if ("message" in result) {
            load_mailbox("sent");
          }
          if ("error" in result) {
            document.querySelector(".message").style.display = "block";
            document.querySelector(".message").innerHTML = result.error;
            document.querySelector("#compose-recipients").value = "";
          }
        });
    } else {
      document.querySelector(".message").style.display = "block";
      document.querySelector(".message").innerHTML =
        "The Email body cannot be empty";
    }

    return false;
  };
}

function load_mailbox(mailbox) {
  set_menuItem_active(mailbox);

  // Show the mailbox and hide other views
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";

  // Show the mailbox name
  document.querySelector(
    "#emails-view"
  ).innerHTML = `<h3 class='inbox-title' >${
    mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
  }</h3>`;

  fetch(`/emails/${mailbox}`)
    .then((response) => response.json())
    .then((emails) => {
      console.log(emails);

      // If the mailbox is empty
      if (emails.length == 0) {
        var emaildiv = document.createElement("div");
        emaildiv.className = "email-div";
        emaildiv.innerHTML = `<p style='text-align:center'>${
          mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
        } is empty.</p>`;
        document.querySelector("#emails-view").appendChild(emaildiv);
      }

      emails.forEach((email) => {
        var emaildiv = document.createElement("div");
        emaildiv.className = "email-div";

        //format timestamp to a shorter one
        let formatted_timestamp = format_timestamp(email.timestamp);

        if (mailbox !== "sent") {
          emaildiv.innerHTML = `
            <p class='sender'>${email.sender}</p>
            <p class='subject'>${email.subject}- <span class="body" style="font-weight:lighter;">${email.body}</span></p> 
            <p class='timestamp'>${formatted_timestamp}</p>
          `;
        } else {
          emaildiv.innerHTML = `
            <p class='sender'>${email.sender}</p>
            <p class='subject'>${email.subject}- <span class="body" style="font-weight:lighter;">${email.body}</span></p> 
            <p class='timestamp except-sent'>${formatted_timestamp}</p>
          `;
        }

        if (mailbox !== "sent") {
          archivediv = document.createElement("div");
          archivediv.className = "archive-div";
          if (email.archived) {
            archivediv.innerHTML = `<input type='button' value='Unarchive' class='archive-btn btn-outline-secondary'>`;
          } else {
            archivediv.innerHTML = `<input type='button' value='Archive' class='archive-btn btn-outline-secondary'>`;
          }

          emaildiv.appendChild(archivediv);
        }

        // if email is read, change background colour and font weight.
        if (email.read) {
          emaildiv.classList.add("email-read");
          emaildiv.querySelector(".sender").style.fontWeight = "light";
          emaildiv.querySelector(".subject").style.fontWeight = "light";
          emaildiv.querySelector(".timestamp").style.fontWeight = "light";
        }

        emaildiv.addEventListener("click", (event) => {
          const element = event.target;

          // if archive button is clicked, archive the email else open the email.
          if (element.className === "archive-btn btn-outline-secondary") {
            element.parentElement.parentElement.style.animationPlayState =
              "running";
            element.parentElement.parentElement.addEventListener(
              "animationend",
              () => {
                element.parentElement.parentElement.remove();
              }
            );
            fetch(`/emails/${email.id}`, {
              method: "PUT",
              body: JSON.stringify({
                archived: !email.archived,
              }),
            });
          } else {
            openEmail(email.id, mailbox);
          }
        });
        document.querySelector("#emails-view").appendChild(emaildiv);
      });
    });
}

function openEmail(emailId, mailbox) {
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email-view").style.display = "block";

  fetch(`/emails/${emailId}`)
    .then((response) => response.json())
    .then((emailbody) => {
      // if opened for first time, mark as read
      if (!emailbody.read) {
        fetch(`/emails/${emailId}`, {
          method: "PUT",
          body: JSON.stringify({
            read: true,
          }),
        });
      }

      // Archive button values
      // console.log(emailbody);

      if (mailbox === "sent") {
        document
          .querySelector(".e-archive-btn")
          .classList.add("except-sent-btn");
      } else {
        document
          .querySelector(".e-archive-btn")
          .classList.remove("except-sent-btn");
      }

      if (emailbody.archived) {
        document.querySelector(".e-archive-btn p").innerHTML = "Unarchive";
      } else {
        document.querySelector(".e-archive-btn p").innerHTML = "Archive";
      }

      document.querySelector(".email-subject").innerHTML = emailbody.subject;
      document.querySelector(".email-mailbox").innerHTML =
        mailbox.toUpperCase();
      document.querySelector(".email-sender").innerHTML =
        "From : " + emailbody.sender;
      document.querySelector(".email-reciever").innerHTML =
        "To : " + emailbody.recipients;
      document.querySelector(".email-timestamp").innerHTML =
        emailbody.timestamp;
      document.querySelector(".email-body").innerHTML = emailbody.body;

      // To go to previous page.
      document.querySelector(".back-btn").onclick = function () {
        load_mailbox(mailbox);
      };

      // to archive/unarchive email.
      document.querySelector(".e-archive-btn").onclick = function () {
        archiveEmail(emailbody.id, mailbox, emailbody.archived);
      };

      // to reply to the email.
      document.querySelectorAll(".reply-btn").forEach((replybtn) => {
        replybtn.onclick = function () {
          compose_email(emailbody.id);
        };
      });
    });
}

function archiveEmail(emailId, mailbox, archiveStatus) {
  // load_mailbox(mailbox);
  fetch(`/emails/${emailId}`, {
    method: "PUT",
    body: JSON.stringify({
      archived: !archiveStatus,
    }),
  }).then(() => load_mailbox(mailbox));
}
