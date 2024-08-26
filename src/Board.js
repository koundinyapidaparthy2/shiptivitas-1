import React from "react";
import Dragula from "dragula";
import "dragula/dist/dragula.css";
import Swimlane from "./Swimlane";
import "./Board.css";

const statusList = ["backlog", "in-progress", "complete"];

const stateMapper = {
  Backlog: "backlog",
  "In Progress": "inProgress",
  Complete: "complete",
};

const statusMapper = {
  Backlog: "backlog",
  "In Progress": "in-progress",
  Complete: "complete",
};

const statusReverseMapperForApi = {
  backlog: "backlog",
  "in-progress": "inProgress",
  complete: "complete",
};

const sortArrayByPriority = (currentArr) => {
  return [...currentArr].sort(
    ({ priority: priority1 }, { priority: priority2 }) => priority1 - priority2
  );
};

// Koundinya Pidaparthy Changes

export default class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      clients: {
        backlog: [],
        inProgress: [],
        complete: [],
      },
      limitQuery: {
        currentStatus: "",
        destinationStatus: "",
        elementId: "",
        siblingId: "",
      },
    };
    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    };
  }
  async getClients() {
    const clients = await Promise.all(
      statusList.map(async (curr) => {
        const currentStatusValue = await fetch(
          `http://localhost:3001/api/v1/clients?status=${curr}`
        )
          .then((data) => data.json())
          .then((unsortedData) => {
            return sortArrayByPriority(unsortedData);
          });
        return {
          [statusReverseMapperForApi[curr]]: currentStatusValue,
        };
      })
    );
    const reducedClients = clients.reduce((acc, curr) => {
      return {
        ...acc,
        ...curr,
      };
    }, {});
    this.setState({ clients: reducedClients });
  }

  async updateClients({
    currentStatus,
    destinationStatus,
    elementId,
    siblingId,
  }) {
    const clients = await fetch(
      `http://localhost:3001/api/v1/clients/${elementId}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentStatus,
          destinationStatus,
          siblingId,
        }),
      }
    ).then((data) => data.json());
    this.setState({
      clients: {
        backlog: clients.filter(({ status }) => status === "backlog"),
        inProgress: clients.filter(({ status }) => status === "in-progress"),
        complete: clients.filter(({ status }) => status === "complete"),
      },
    });
  }

  renderSwimlane(name, clients, ref) {
    return <Swimlane name={name} clients={clients} dragulaRef={ref} />;
  }
  componentDidMount() {
    // On Initial Render
    this.getClients();
    if (
      this.swimlanes.backlog.current &&
      this.swimlanes.inProgress.current &&
      this.swimlanes.complete.current
    ) {
      Dragula(
        [
          this.swimlanes.backlog.current,
          this.swimlanes.inProgress.current,
          this.swimlanes.complete.current,
        ],
        {
          direction: "horizontal",
          moves: (_el, _container) => {
            return true;
          },
          accepts: (
            currElement,
            destinationContainer,
            currentContainer,
            siblingElement
          ) => {
            const currentStatus = currentContainer.getAttribute("id");
            const destinationStatus = destinationContainer.getAttribute("id");
            const elementId = currElement.getAttribute("data-id");
            let siblingId = "";
            if (siblingElement) {
              siblingId = siblingElement.getAttribute("data-id");
            }
            if (
              this.state.limitQuery.currentStatus !== currentStatus ||
              this.state.limitQuery.destinationStatus !== destinationStatus ||
              this.state.limitQuery.elementId !== elementId ||
              this.state.limitQuery.siblingId !== siblingId
            ) {
              this.setState({
                limitQuery: {
                  currentStatus,
                  destinationStatus,
                  elementId,
                  siblingId,
                },
              });
              this.updateClients({
                currentStatus: statusMapper[currentStatus],
                destinationStatus: statusMapper[destinationStatus],
                elementId: elementId,
                siblingId: siblingId,
              });
            }
            return false;
          },
          invalid: () => {
            return false;
          },
          copy: false,
          copySortSource: false,
          revertOnSpill: false,
          removeOnSpill: false,
          mirrorContainer: document.body,
          delay: 10,
          ignoreInputTextSelection: true,
          slideFactorX: 0,
          slideFactorY: 0,
        }
      );
    }
  }
  render() {
    return (
      <div className="Board">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              {this.renderSwimlane(
                "Backlog",
                this.state.clients.backlog,
                this.swimlanes.backlog
              )}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane(
                "In Progress",
                this.state.clients.inProgress,
                this.swimlanes.inProgress
              )}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane(
                "Complete",
                this.state.clients.complete,
                this.swimlanes.complete
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
