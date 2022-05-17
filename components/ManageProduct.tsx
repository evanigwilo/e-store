import { NextComponentType, NextPageContext } from "next";
import Image from "next/image";
import React, {
  useState,
  useEffect,
  FormEvent,
  useRef,
  createRef,
  useReducer,
} from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import { useAppSelector, useAppDispatch } from "../redux/hooks";
import {
  createUpdateProductAsync,
  getProductAsync,
  deleteProductAsync,
  uploadProductImageAsync,
  deleteProductImageAsync,
  selectProduct,
  productActions,
} from "../redux/reducer/productSlice";
import InfoToast from "./InfoToast";
import {
  darkOpacityText,
  ImageSlotActionType,
  mimeTypes,
  slotCount,
} from "../utils/constants";
import {
  collapseElement,
  progressButton,
  Progress,
  reduceToValue,
  getImageUrl,
  hasImage,
  getImageSlot,
} from "../utils/helpers";
import {
  ManageProductProps,
  ImageSlotAction,
  ImageSlotActionPayload,
  ImageSlotState,
  KeyValue,
  ToastController,
  ToastProp,
} from "../utils/types";
import DeleteModal from "./DeleteModal";
import ImagePreview from "./ImagePreview";
import styles from "../styles/ManageProduct.module.css";

const ManageProduct: NextComponentType<
  NextPageContext,
  {},
  ManageProductProps
> = (props) => {
  const { filter, router, productId, updateProduct, removeProduct } = props;

  // 👇 useSelectors & Actions
  const dispatch = useAppDispatch();
  const {
    category: { result: categories },
    delete: { pending: deletePending, error: deleteError },
    createUpdateGet: {
      pending: createUpdateGetPending,
      error: createUpdateGetError,
      result: createUpdateGetResult,
    },
    image: { pending: imagePending, error: imageError },
  } = useAppSelector(selectProduct);
  const {
    clearCreateUpdateGetError,
    clearCreateUpdateGetResult,
    setCreateUpdateGetError,
    clearImageError,
    clearDeleteError,
  } = productActions;

  // 👇 Methods
  const productErrors = (key: "product" | "price" | "category" | "unknown") =>
    collapseElement(
      Boolean(createUpdateGetError[key]),
      createUpdateGetError[key]
    );
  const slotErrors = () =>
    collapseElement(
      slotError !== 0 &&
        (Boolean(imageSlot.error[slotError]) || Boolean(imageError[slotError])),
      imageSlot.error[slotError] || imageError[slotError]
    );
  const addToast = (
    key: "GET" | "UPDATE" | "UPLOAD-IMAGE",
    message: string
  ) => {
    setMessages((prev) => ({
      ...prev,
      [key]: {
        message,
        delay: 3000,
        onClose: () =>
          setMessages((prev) => {
            delete prev[key];
            return prev;
          }),
      },
    }));
  };
  const imageHasLoaded = (slot: number, value = true) => {
    setImageLoaded((prev) => ({
      ...prev,
      [slot]: value,
    }));
  };
  const imageSlots = () => {
    const slots: JSX.Element[] = slotCount.map((slot) => {
      const id = "slot-" + slot;
      return (
        <div key={slot}>
          <Form.Control
            title="Upload"
            hidden
            type="file"
            accept="image/*"
            id={id}
            onChange={({ target }) =>
              imageSlotDispatch({
                type: ImageSlotActionType.FILECHANGE,
                payload: {
                  slot,
                  files: (target as HTMLInputElement).files,
                },
              })
            }
            onClick={({ target }) => {
              (target as HTMLInputElement).value = "";
            }}
          />

          <div
            className={"position-relative " + `${styles["border-image-size"]}`}
            ref={dropArea[slot]}
          >
            {imageSlot.url[slot] ? (
              <>
                {/* Image */}
                <Image
                  title="Preview"
                  src={imageSlot.url[slot]}
                  onError={() => imageHasLoaded(slot)}
                  onLoadingComplete={() => imageHasLoaded(slot)}
                  onClick={() => setShowImagePreview(slot)}
                  alt="No Image"
                  layout="fill"
                  className={
                    "css-mouse-enter rounded-3 border border-secondary " +
                    styles["border-image-style"]
                  }
                  //   priority
                  //   width={80}
                  //   height={70}
                  //   layout="fixed"
                  //   objectFit="contain"
                />

                {/* Uploading progress & Close Image */}
                {imagePending[slot] || !imageLoaded[slot] ? (
                  <div className="css-cursor-progress position-absolute css-content-center w-100 h-100 bg-dark bg-opacity-75 text-white">
                    {Progress()}
                  </div>
                ) : (
                  <span
                    title="Delete"
                    role="button"
                    className={
                      "btn-close position-absolute top-0 start-100 " +
                      "translate-middle p-2 border bg-light opacity-75 " +
                      `rounded-circle ${styles["image-delete"]}`
                    }
                    onClick={() =>
                      imageSlotDispatch({
                        type: ImageSlotActionType.CLEARIMAGE,
                        payload: { slot },
                      })
                    }
                  ></span>
                )}
              </>
            ) : imagePending[slot] ? (
              <div className="css-content-center w-100 h-100 ">
                {Progress()}
              </div>
            ) : (
              <Form.Label
                role="button"
                htmlFor={id}
                className="m-0 w-100 h-100"
              >
                <i
                  className={
                    "bi bi-cloud-upload fs-3 w-100 h-100 " +
                    "border border-secondary rounded-3 " +
                    `css-content-center css-mouse-enter ${styles["border-image-style"]}`
                  }
                ></i>
              </Form.Label>
            )}
          </div>

          {/* Toggle Error */}
          {(imageError[slot] || imageSlot.error[slot]) && (
            <i
              title="Image Error"
              onClick={() => setSlotError(slotError ? 0 : slot)}
              className={
                "py-1 text-danger bi bi-exclamation-triangle-fill " +
                "css-mouse-enter text-center text-danger opacity-75 " +
                "border-3 border-bottom border-danger d-grid"
              }
            ></i>
          )}
        </div>
      );
    });
    return <div className="d-flex justify-content-around">{slots}</div>;
  };
  // 👇 show image uploaded toast only when last image has been successfully uploaded
  const lastImageUploaded = () => {
    updateProduct(productStatus.update);
    productStatus.uploading -= 1;
    if (productStatus.uploading === 0) {
      addToast("UPLOAD-IMAGE", "Image updated...");
    }
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const product = inputProduct.current!.value;
    const price = inputPrice.current!.value;
    const category = inputCategory.current!.value;

    if (!product.length) {
      dispatch(
        setCreateUpdateGetError({
          product: "Product name is not valid.",
        })
      );
      return;
    }

    addToast("UPDATE", `${productId ? "Updating" : "Creating"} Product...`);

    const { update } = productStatus;

    dispatch(
      createUpdateProductAsync({
        name: product.trim(),
        category: category.trim(),
        price: parseFloat(price.trim()) || 0,
        id: productId,
      })
    )
      .unwrap()
      .then((product) => {
        addToast("UPDATE", `Product ${productId ? "updated" : "created"}`);

        update.product = product;

        router.push(router.pathname + "?id=" + product.id, undefined, {
          shallow: true,
        });

        // 👇 keep count of images to be uploaded
        productStatus.uploading = 0;
        Object.values(imageSlot.url).forEach((url) => {
          if (productId && !url) {
            productStatus.uploading += 1;
          }
        });
        Object.values(imageSlot.file).forEach((file) => {
          if (file) {
            productStatus.uploading += 1;
          }
        });
        if (productStatus.uploading > 0) {
          addToast("UPLOAD-IMAGE", "Updating image...");
        }

        productId &&
          Object.entries(imageSlot.url).forEach(
            ([slot, url]) =>
              !url &&
              dispatch(
                deleteProductImageAsync({
                  productId,
                  slot,
                })
              )
                .unwrap()
                .then(() => {
                  update.image[slot] = "REMOVE";
                  lastImageUploaded();
                })
                .catch(() => null)
          );
        Object.entries(imageSlot.file).forEach(
          ([slot, file]) =>
            file &&
            dispatch(
              uploadProductImageAsync({
                productId: product.id,
                slot,
                file,
              })
            )
              .unwrap()
              .then(() => {
                update.image[slot] = "ADD";
                lastImageUploaded();
              })
              .catch(() => null)
        );
      })
      .catch(() => null)
      .finally(() => updateProduct(productStatus.update));
  };

  // 👇 State and Variables
  const { current: productStatus } = useRef<ToastController>({
    uploading: 0,
    update: {
      product: {},
      image: {},
    },
  });
  const { current: dropArea } = useRef(
    reduceToValue(slotCount, () => createRef<HTMLDivElement>())
  );
  const {
    current: { inputProduct, inputCategory, inputPrice, inputCategoryDrop },
  } = useRef({
    inputProduct: createRef<HTMLInputElement>(),
    inputCategory: createRef<HTMLInputElement>(),
    inputPrice: createRef<HTMLInputElement>(),
    inputCategoryDrop: createRef<HTMLButtonElement>(),
  });

  const [messages, setMessages] = useState<KeyValue<ToastProp>>({});
  const [showDeleteProduct, setShowDeleteProduct] = useState(false);
  const [showManageProduct, setShowManageProduct] = useState(true);
  const [showImagePreview, setShowImagePreview] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(
    reduceToValue(slotCount, () => false)
  );
  const [slotError, setSlotError] = useState(0);

  // 👇 Reducer
  const [imageSlot, imageSlotDispatch] = useReducer(
    (state: ImageSlotState, action: ImageSlotAction) => {
      const { slot, files, product } =
        action.payload as Required<ImageSlotActionPayload>;
      switch (action.type) {
        case ImageSlotActionType.LOADIMAGE:
          dispatch(clearImageError(slotCount));

          const url: KeyValue = slotCount.reduce((prev, curr) => {
            if (hasImage(product, curr)) {
              prev[curr] = getImageUrl(productId, curr, Date.now());
            }
            return prev;
          }, {} as KeyValue);

          return {
            ...state,
            url,
          };
        case ImageSlotActionType.FILECHANGE:
          // 👇 free memory
          URL.revokeObjectURL(state.url[slot]);

          // 👇 Maximum allowed size in bytes (1 MB)
          const MAX_FILE_SIZE_BYTES = 1024 * 1024;
          const fileObj = files && files[0];
          if (!fileObj) {
            return state;
          }

          const error = !mimeTypes.includes(fileObj.type)
            ? "File type not supported."
            : fileObj.size > MAX_FILE_SIZE_BYTES
            ? "Maximum allowed size is 1 MB."
            : "";

          imageHasLoaded(slot, false);

          return {
            ...state,
            url: {
              ...state.url,
              [slot]: URL.createObjectURL(fileObj),
            },
            error: {
              ...state.error,
              [slot]: error,
            },
            file: {
              ...state.file,
              [slot]: error ? undefined : fileObj,
            },
          };
        case ImageSlotActionType.CLEARIMAGE:
          // 👇 free memory
          URL.revokeObjectURL(state.url[slot]);

          slotError === slot && setSlotError(0);

          dispatch(clearImageError([slot]));

          return {
            ...state,
            url: {
              ...state.url,
              [slot]: "",
            },
            error: {
              ...state.error,
              [slot]: "",
            },
            file: {
              ...state.file,
              [slot]: undefined,
            },
          };

        default:
          return state;
      }
    },
    {
      url: {},
      error: {},
      file: {},
    }
  );

  // 👇 Loading variables
  const noCategories = !categories.length;
  const uploadingImage = Object.values(imagePending).some(Boolean);
  const loadingImage = Object.entries(imageSlot.url).some(
    ([key, value]) => value && !imageLoaded[key]
  );
  const errorInImageSlot = Object.values(imageSlot.error).some(Boolean);
  const disableInputs = createUpdateGetPending || uploadingImage;
  const onlyLoading = disableInputs || noCategories || loadingImage;

  // 👇 useEffects
  useEffect(() => {
    dispatch(clearImageError(slotCount));
    dispatch(clearCreateUpdateGetResult());
    dispatch(clearCreateUpdateGetError());

    if (!productId) {
      return;
    }
    addToast("GET", "Getting Product...");
    dispatch(getProductAsync({ productId }))
      .unwrap()
      .then((product) => {
        const { name, category, price } = product;
        inputProduct.current!.value = name;
        inputCategory.current!.value = category;
        inputPrice.current!.value = price as string;

        if (getImageSlot(product, true)) {
          addToast("GET", "Loading images...");
        } else {
          addToast("GET", "Product loaded.");
        }
        imageSlotDispatch({
          type: ImageSlotActionType.LOADIMAGE,
          payload: {
            product,
          },
        });
      })
      .catch(() => null);
  }, []);
  // 👇 drag and drop events setup for image upload
  useEffect(() => {
    const events: KeyValue<((event: DragEvent) => void)[]> = {};

    Object.entries(dropArea).forEach(async ([slot, target]) => {
      const element = target.current;
      if (!element) return;

      const stopDefault = (event: DragEvent): Boolean => {
        event.stopPropagation();
        event.preventDefault();
        return (
          imagePending[slot] || (imageSlot.url[slot] && !imageLoaded[slot])
        );
      };

      const dragOver = (event: DragEvent) => {
        if (stopDefault(event)) return;
        // Style the drag-and-drop as a "copy file" operation.
        element.classList.add(styles["image-drag-enter"]);
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
      };
      const dragLeave = (event: DragEvent) => {
        if (stopDefault(event)) return;
        element.classList.remove(styles["image-drag-enter"]);
      };
      const drop = (event: DragEvent) => {
        if (stopDefault(event)) return;
        element.classList.remove(styles["image-drag-enter"]);
        const fileList = event.dataTransfer?.files;
        imageSlotDispatch({
          type: ImageSlotActionType.FILECHANGE,
          payload: {
            slot: Number(slot),
            files: fileList,
          },
        });
      };

      element.addEventListener("dragover", dragOver);
      element.addEventListener("dragleave", dragLeave);
      element.addEventListener("drop", drop);

      events[slot] = [dragOver, dragLeave, drop];
    });

    return () => {
      Object.entries(dropArea).forEach(async ([slot, target]) => {
        const element = target.current;
        if (element && events[slot]) {
          events[slot].forEach((listener) =>
            element.removeEventListener(
              listener.name.toLowerCase() as keyof HTMLElementEventMap,
              listener as EventListener
            )
          );
        }
      });
    };
  }, [imagePending, imageLoaded, imageSlot.url]);
  useEffect(() => {
    const category = inputCategory.current;
    if (!noCategories && category) {
      category.value = filter || categories[0];
    }
  }, [categories, inputCategory]);

  // 👉 console.log("ManageProduct");

  return (
    <>
      <Modal
        show={showManageProduct}
        onExited={() =>
          router.push(router.pathname, undefined, {
            shallow: true,
          })
        }
        onHide={() => setShowManageProduct(false)}
        keyboard={false}
        backdrop="static"
        // scrollable
        centered
        className={`p-0 ${darkOpacityText} ${styles["modal-form"]}`}
      >
        <Modal.Header
          closeButton={!createUpdateGetPending && !uploadingImage}
          className="border-0 mt-3"
        >
          <Modal.Title className={`lead fs-4 ${styles["line-height"]}`}>
            {`${productId ? "Edit" : "Add New"} Product`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form noValidate>
            <Form.Group controlId="formProduct">
              <Form.Label>Product Name</Form.Label>
              <Form.Control
                ref={inputProduct}
                className={darkOpacityText}
                type="text"
                placeholder="E.g. Nike Air Force"
                disabled={disableInputs}
              />
              {productErrors("product")}
            </Form.Group>

            <Form.Group controlId="formCategory">
              <Form.Label className="mt-3">Category</Form.Label>

              <Dropdown>
                {noCategories ? (
                  <>{Progress()}</>
                ) : (
                  <div className="position-relative">
                    <Dropdown.Toggle
                      className="position-absolute top-50 translate-middle-y invisible"
                      ref={inputCategoryDrop}
                      disabled={disableInputs}
                    ></Dropdown.Toggle>

                    <Form.Control
                      disabled={disableInputs}
                      ref={inputCategory}
                      className={
                        disableInputs
                          ? "text-muted"
                          : `bg-transparent ${darkOpacityText}`
                      }
                      readOnly={true}
                      role="button"
                      onClick={() =>
                        inputCategoryDrop.current &&
                        inputCategoryDrop.current.click()
                      }
                      type="text"
                    />
                    <i
                      className={
                        "bi bi-chevron-down position-absolute " +
                        "top-50 end-0 translate-middle-y pe-2 pe-none"
                      }
                    ></i>
                  </div>
                )}
                <Dropdown.Menu className="w-100">
                  {categories.map((value, index) => (
                    <Dropdown.Item
                      key={index}
                      className={darkOpacityText}
                      onClick={() => (inputCategory.current!.value = value)}
                    >
                      {value}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
              {productErrors("category")}
            </Form.Group>

            <Form.Group controlId="formPrice">
              <Form.Label className="mt-3">Price</Form.Label>
              <div className="position-relative">
                <div className="position-absolute css-content-center h-100 ps-2">
                  <i className="bi bi-currency-dollar"></i>
                </div>

                <Form.Control
                  ref={inputPrice}
                  type="number"
                  //   pattern="[0-9]*"
                  inputMode="decimal"
                  min={0}
                  placeholder="0.00"
                  disabled={disableInputs}
                  className={`ps-4 pe-5 ${darkOpacityText}`}
                />

                <span className="position-absolute top-50 end-0 translate-middle-y pe-2">
                  USD
                </span>
              </div>

              {productErrors("price")}

              {productErrors("unknown")}
            </Form.Group>

            <Form.Group
            //   controlId="formImage"
            >
              <Form.Label className="mt-3 d-block">Upload Images</Form.Label>

              {imageSlots()}

              {slotErrors()}
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer className="border-0 flex-column mt-0">
          <div className="d-flex justify-content-end align-items-center w-100 ms-auto">
            {productId && (
              <OverlayTrigger
                placement="top"
                delay={{ show: 250, hide: 400 }}
                overlay={<Tooltip>Delete product</Tooltip>}
              >
                <i
                  onClick={() => setShowDeleteProduct(true)}
                  className={
                    "bi bi-trash3 me-auto " +
                    "text-opacity-75 fs-5 css-mouse-enter " +
                    (onlyLoading ? "pe-none text-secondary" : "text-danger")
                  }
                ></i>
              </OverlayTrigger>
            )}
            <div>
              <Button
                variant="outline-secondary"
                disabled={createUpdateGetPending || uploadingImage}
                onClick={() => setShowManageProduct(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={onlyLoading || errorInImageSlot}
                className="css-btn-dark ms-2"
              >
                {progressButton(onlyLoading, "Publish")}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Preview Modal*/}
      <ImagePreview
        htmlForProgress={!imageLoaded[showImagePreview]}
        htmlFor={"slot-" + showImagePreview}
        closeButton={Boolean(imageLoaded[showImagePreview])}
        setShow={setShowImagePreview}
        show={showImagePreview}
        src={imageSlot.url[showImagePreview]}
      />

      {/* Delete Modal */}
      <DeleteModal
        show={showDeleteProduct}
        setShow={setShowDeleteProduct}
        message={`Delete ${createUpdateGetResult.name} ?`}
        loading={deletePending}
        onClickDelete={() => {
          dispatch(deleteProductAsync({ productId }))
            .unwrap()
            .then(() => {
              setShowDeleteProduct(false);
              setShowManageProduct(false);
              removeProduct(productId);
            })
            .catch(() => null);
        }}
        error={deleteError["unknown"]}
        onExit={() => dispatch(clearDeleteError())}
      />

      <InfoToast messages={Object.values(messages)} />
    </>
  );
};

export default ManageProduct;
