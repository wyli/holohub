# Distributed H.264 Endoscopy Tool Tracking

This application is similar to the [H.264 Endoscopy Tool Tracking](../../../h264/h264_endoscopy_tool_tracking/) application, but this distributed version divides the application into three fragments:

1. Video Input: get video input from a pre-recorded video file.
2. Inference: run the inference using LSTM and run the post-processing script.
3. Visualization: display input video and inference results.


## Requirements

This application is configured to use H.264 elementary stream from endoscopy sample data as input.

### Data

[📦️ (NGC) Sample App Data for AI-based Endoscopy Tool Tracking](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/clara-holoscan/resources/holoscan_endoscopy_sample_data)

The data is automatically downloaded when building the application.

## Building and Running H.264 Endoscopy Tool Tracking Application

* Building and running the application from the top level Holohub directory:

### C++

```bash
# Start the application with all three fragments
./holohub run ucx_h264_endoscopy_tool_tracking --language=cpp

# Use the following commands to run the same application three processes:
# Start the application with the video_in fragment
./holohub run ucx_h264_endoscopy_tool_tracking --language=cpp --run-args="--driver --worker --fragments video_in --address :10000 --worker-address :10001"
# Start the application with the inference fragment
./holohub run ucx_h264_endoscopy_tool_tracking --language=cpp --run-args="--worker --fragments inference --address :10000 --worker-address :10002"
# Start the application with the visualization fragment
./holohub run ucx_h264_endoscopy_tool_tracking --language=cpp --run-args="--worker --fragments viz --address :10000 --worker-address :10003"
```

### Python

```bash
# Start the application with all three fragments
./holohub run ucx_h264_endoscopy_tool_tracking --language=python

# Use the following commands to run the same application three processes:
# Start the application with the video_in fragment
./holohub run ucx_h264_endoscopy_tool_tracking --language=python --run-args="--driver --worker --fragments video_in --address :10000 --worker-address :10001"
# Start the application with the inference fragment
./holohub run ucx_h264_endoscopy_tool_tracking --language=python --run-args="--worker --fragments inference --address :10000 --worker-address :10002"
# Start the application with the visualization fragment
./holohub run ucx_h264_endoscopy_tool_tracking --language=python --run-args="--worker --fragments viz --address :10000 --worker-address :10003"
```

Important: on aarch64, applications also need tegra folder mounted inside the container and
the `LD_LIBRARY_PATH` environment variable should be updated to include
tegra folder path.

Open and edit the [Dockerfile](../../../h264/Dockerfile) and uncomment line 66:

```bash
# Uncomment the following line for aarch64 support
ENV LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/lib/aarch64-linux-gnu/tegra/
```


## Dev Container

To start the VS Code Dev Container, run the following command from the root directory of Holohub:

```bash
./holohub vscode h264
```

### VS Code Launch Profiles

#### C++

Use the **(gdb) ucx_h264_endoscopy_tool_tracking/cpp (all fragments)** launch profile to run and debug the C++ application.

#### Python

Use the **(pythoncpp) ucx_h264_endoscopy_tool_tracking/python (all fragments)** launch profile to run and debug the Python application.
