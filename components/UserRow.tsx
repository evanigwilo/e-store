import { memo, useState, useEffect } from "react";
import { NextComponentType, NextPageContext } from "next";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import NavDropdown from "react-bootstrap/NavDropdown";

import {
  addToGroupAsync,
  removeFromGroupAsync,
  selectUsers,
} from "../redux/reducer/usersSlice";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { User } from "../utils/types";
import { darkOpacityText, userGroups } from "../utils/constants";

const UserRow: NextComponentType<
  NextPageContext,
  {},
  {
    user: User;
  }
> = (props) => {
  const {
    user: { username, gender, group, status },
  } = props;

  const [currentGroup, setCurrentGroup] = useState(group);

  const dispatch = useAppDispatch();
  const {
    pending: { update: updatePending },
    result: { update: updateResult },
  } = useAppSelector(selectUsers);

  useEffect(() => {
    if (updateResult.username === username) {
      setCurrentGroup(updateResult.group);
    }
  }, [updateResult]);

  // 👉 console.log("UserRow");

  return (
    <>
      <Row
        className={`g-0 text-center p-3 mb-2 bg-white align-items-center ${darkOpacityText}`}
      >
        <Col className="text-start text-capitalize">{username}</Col>
        <Col>
          <NavDropdown
            disabled={updatePending}
            title={userGroups[currentGroup]}
            className={`fs-6 p-0 d-flex justify-content-start ${
              updatePending && "opacity-75 css-cursor-progress"
            }`}
            onContextMenu={(e) => e.preventDefault()}
          >
            {Object.entries(userGroups).map(([group, details], idx) => (
              <NavDropdown.Item
                key={idx}
                active={group === currentGroup}
                onClick={() => {
                  if (group === currentGroup) {
                    return;
                  }
                  dispatch(
                    group
                      ? addToGroupAsync({ username, group })
                      : removeFromGroupAsync({ username, group: currentGroup })
                  );
                }}
              >
                {details}
              </NavDropdown.Item>
            ))}
          </NavDropdown>
        </Col>
        <Col xs={2} className="text-capitalize">
          {gender}
        </Col>
        <Col xs={2} className="d-sm-block d-none">
          <Badge pill className="py-2" bg="success">
            {status}
          </Badge>
        </Col>
        <Col xs={1}></Col>
      </Row>
    </>
  );
};

export default memo(UserRow);
